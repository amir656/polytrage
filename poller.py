#!/usr/bin/env python3
"""
Polytrage Poller

Detects two kinds of arbitrage opportunities:
  1. Oracle mismatch  — Pyth oracle price contradicts Polymarket odds
  2. Cross-venue      — Same event priced differently on Polymarket vs Kalshi

Sends Telegram alerts and writes results to data/opportunities.json so the
Next.js dashboard can display them.

Usage:
    pip install -r requirements.txt
    cp .env.example .env.local   # fill in credentials
    python poller.py
"""

import asyncio
import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

import aiohttp
from dotenv import load_dotenv

load_dotenv(".env.local")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
MIN_PROFIT_MARGIN = float(os.getenv("MIN_PROFIT_MARGIN", "3.0"))
SCAN_INTERVAL = int(os.getenv("SCAN_INTERVAL_SECONDS", "60"))
DATA_FILE = "data/opportunities.json"

KALSHI_EMAIL = os.getenv("KALSHI_EMAIL", "")
KALSHI_PASSWORD = os.getenv("KALSHI_PASSWORD", "")
KALSHI_API = "https://api.elections.kalshi.com/trade-api/v2"  # prod endpoint

PYTH_ENDPOINT = "https://hermes.pyth.network"
PRICE_IDS = {
    "BTC": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    "ETH": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
}

POLYMARKET_GAMMA = "https://gamma-api.polymarket.com"

# ---------------------------------------------------------------------------
# Data I/O
# ---------------------------------------------------------------------------

def load_data() -> dict:
    os.makedirs("data", exist_ok=True)
    if not os.path.exists(DATA_FILE):
        return {"lastScanAt": None, "opportunities": []}
    with open(DATA_FILE) as f:
        return json.load(f)


def save_data(data: dict):
    os.makedirs("data", exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ---------------------------------------------------------------------------
# Pyth
# ---------------------------------------------------------------------------

async def fetch_pyth_prices(session: aiohttp.ClientSession) -> dict:
    """Returns {'BTC': {'price': float, 'confidence': float}, 'ETH': ...}"""
    ids = list(PRICE_IDS.values())
    url = f"{PYTH_ENDPOINT}/v2/updates/price/latest"
    params = [("ids[]", pid) for pid in ids]

    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
        resp.raise_for_status()
        data = await resp.json()

    prices: dict = {}
    for feed in data.get("parsed", []):
        feed_id = "0x" + feed["id"]
        pd = feed["price"]
        expo = int(pd["expo"])
        price = int(pd["price"]) * (10 ** expo)
        conf = int(pd["conf"]) * (10 ** expo)
        for sym, pid in PRICE_IDS.items():
            if pid == feed_id:
                prices[sym] = {"price": price, "confidence": conf}
    return prices


# ---------------------------------------------------------------------------
# Polymarket
# ---------------------------------------------------------------------------

async def fetch_polymarket_markets(session: aiohttp.ClientSession) -> list:
    """Fetch active crypto prediction markets from Polymarket Gamma API."""
    url = f"{POLYMARKET_GAMMA}/markets"
    params = {"active": "true", "closed": "false", "limit": 100, "tag_slug": "crypto"}
    try:
        async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                print(f"  Polymarket API returned {resp.status}")
                return []
            raw = await resp.json()
            return raw if isinstance(raw, list) else raw.get("markets", [])
    except Exception as e:
        print(f"  Polymarket fetch error: {e}")
        return []


def _parse_dollar_amount(text: str) -> Optional[float]:
    """Extract the largest dollar amount from a string."""
    text = text.lower().replace(",", "")
    matches = re.findall(r'\$([0-9]+(?:\.[0-9]+)?(?:k|m|b)?)', text)
    if not matches:
        return None

    def to_float(s: str) -> float:
        if s.endswith("b"):
            return float(s[:-1]) * 1_000_000_000
        if s.endswith("m"):
            return float(s[:-1]) * 1_000_000
        if s.endswith("k"):
            return float(s[:-1]) * 1_000
        return float(s)

    return max(to_float(m) for m in matches)


def _asset_from_text(text: str) -> Optional[str]:
    t = text.lower()
    if "bitcoin" in t or " btc" in t:
        return "BTC"
    if "ethereum" in t or " eth" in t:
        return "ETH"
    return None


def _poly_yes_price(market: dict) -> Optional[float]:
    """Return the YES token price (0–1) for a Polymarket market."""
    for token in market.get("tokens", []):
        if token.get("outcome", "").upper() != "YES":
            continue
        try:
            p = float(token["price"])
            return p / 100 if p > 1 else p
        except (TypeError, ValueError, KeyError):
            pass
    return None


def _poly_no_price(market: dict) -> Optional[float]:
    for token in market.get("tokens", []):
        if token.get("outcome", "").upper() != "NO":
            continue
        try:
            p = float(token["price"])
            return p / 100 if p > 1 else p
        except (TypeError, ValueError, KeyError):
            pass
    return None


def _poly_volume(market: dict) -> float:
    for field in ("volumeNum", "volume", "liquidityNum", "liquidity"):
        try:
            v = float(market.get(field) or 0)
            if v > 0:
                return v
        except (TypeError, ValueError):
            pass
    return 0.0


def _poly_url(market: dict) -> str:
    slug = market.get("slug", market.get("conditionId", ""))
    if slug and not slug.startswith("0x"):
        return f"https://polymarket.com/event/{slug}"
    return "https://polymarket.com"


def _confidence(profit_margin: float, volume: float) -> float:
    conf = 50.0
    if volume > 1_000_000:
        conf += 20
    elif volume > 100_000:
        conf += 10
    if profit_margin > 15:
        conf += 25
    elif profit_margin > 8:
        conf += 15
    elif profit_margin > 4:
        conf += 5
    return min(conf, 95)


def detect_oracle_opportunity(market: dict, prices: dict) -> Optional[dict]:
    """Oracle mismatch: Pyth oracle contradicts Polymarket odds."""
    question = market.get("question", "")
    q_lower = question.lower()
    asset = _asset_from_text(q_lower)
    if not asset or asset not in prices:
        return None

    upside_keywords = ["reach", "hit", "exceed", "above", "surpass", "break"]
    if not any(w in q_lower for w in upside_keywords):
        return None

    target_price = _parse_dollar_amount(question)
    if not target_price or target_price < 100:
        return None

    oracle_price = prices[asset]["price"]
    yes_price = _poly_yes_price(market)
    no_price = _poly_no_price(market)

    if yes_price is None or yes_price <= 0:
        return None

    ratio = oracle_price / target_price

    if ratio >= 1.0:
        fair_yes = 0.92
        if yes_price >= fair_yes - 0.04:
            return None
        trade_side = "YES"
        trade_price = yes_price
        profit_margin = (fair_yes - yes_price) / yes_price * 100
    elif ratio <= 0.80:
        if no_price is None or no_price <= 0:
            return None
        fair_no = max(0.70, 1.0 - ratio * 0.4)
        if no_price >= fair_no - 0.04:
            return None
        trade_side = "NO"
        trade_price = no_price
        profit_margin = (fair_no - no_price) / no_price * 100
    else:
        return None

    if profit_margin < MIN_PROFIT_MARGIN:
        return None

    volume = _poly_volume(market)

    return {
        "id": str(uuid.uuid4()),
        "type": "oracle",
        "market": question,
        "conditionId": market.get("conditionId", market.get("id", "")),
        "asset": asset,
        "side": trade_side,
        "marketOdds": round(trade_price, 4),
        "marketUrl": _poly_url(market),
        "oraclePrice": round(oracle_price, 2),
        "targetPrice": target_price,
        "profitMargin": round(profit_margin, 2),
        "confidence": round(_confidence(profit_margin, volume), 1),
        "status": "pending",
        "detectedAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Kalshi
# ---------------------------------------------------------------------------

_kalshi_token: Optional[str] = None


async def kalshi_login(session: aiohttp.ClientSession) -> Optional[str]:
    """Login to Kalshi and return a JWT token."""
    if not KALSHI_EMAIL or not KALSHI_PASSWORD:
        return None
    url = f"{KALSHI_API}/login"
    try:
        async with session.post(
            url,
            json={"email": KALSHI_EMAIL, "password": KALSHI_PASSWORD},
            timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                token = data.get("token")
                if token:
                    print("  Kalshi — logged in")
                return token
            body = await resp.text()
            print(f"  Kalshi login failed ({resp.status}): {body[:120]}")
            return None
    except Exception as e:
        print(f"  Kalshi login error: {e}")
        return None


async def fetch_kalshi_markets(session: aiohttp.ClientSession, token: str) -> list:
    """Fetch open Kalshi markets, returning all pages."""
    headers = {"Authorization": f"Bearer {token}"}
    markets: list = []
    cursor: Optional[str] = None

    # Fetch crypto-relevant series; fall back to all open markets if series not found
    for series in ("KXBTC", "KXETH", "KXBTCUSD", "KXETHUSD"):
        params: dict = {"status": "open", "limit": 200, "series_ticker": series}
        if cursor:
            params["cursor"] = cursor
        try:
            async with session.get(
                f"{KALSHI_API}/markets",
                params=params,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    markets.extend(data.get("markets", []))
        except Exception:
            pass

    # If we got nothing from series filtering, try a broad open-market fetch
    if not markets:
        try:
            async with session.get(
                f"{KALSHI_API}/markets",
                params={"status": "open", "limit": 200},
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    raw = data.get("markets", [])
                    # Keep only crypto-relevant ones
                    markets = [
                        m for m in raw
                        if _asset_from_text(m.get("title", "") + m.get("ticker", ""))
                    ]
        except Exception as e:
            print(f"  Kalshi broad fetch error: {e}")

    return markets


def _parse_kalshi_market(market: dict) -> Optional[dict]:
    """
    Extract (asset, target_price, yes_price, no_price, url, title, ticker) from a
    Kalshi market dict, or return None if we can't parse it.
    """
    title = market.get("title", "")
    asset = _asset_from_text(title)
    if not asset:
        return None

    target_price = _parse_dollar_amount(title)
    if not target_price or target_price < 100:
        return None

    # Prices are in cents (0–99); normalise to 0–1
    try:
        yes_ask = market.get("yes_ask") or market.get("last_price")
        no_ask = market.get("no_ask")
        yes_price = float(yes_ask) / 100 if yes_ask is not None else None
        no_price = float(no_ask) / 100 if no_ask is not None else None
    except (TypeError, ValueError):
        return None

    if yes_price is None or not (0 < yes_price < 1):
        return None

    ticker = market.get("ticker", "")
    event_ticker = market.get("event_ticker", "")
    url = f"https://kalshi.com/markets/{event_ticker}/{ticker}" if event_ticker else f"https://kalshi.com/markets/{ticker}"

    return {
        "asset": asset,
        "targetPrice": target_price,
        "yesPrice": round(yes_price, 4),
        "noPrice": round(no_price, 4) if no_price is not None else round(1 - yes_price, 4),
        "url": url,
        "title": title,
        "ticker": ticker,
        "volume": float(market.get("volume", 0) or 0),
    }


def detect_cross_venue_opportunities(
    poly_markets: list,
    kalshi_markets: list,
) -> list[dict]:
    """
    Match Polymarket and Kalshi markets by (asset, target_price) and return
    opportunities where the spread exceeds MIN_PROFIT_MARGIN.
    """
    # Build a lookup from (asset, target_price_bin) → parsed Kalshi market
    # We bin target prices to the nearest 1% to allow fuzzy matching
    def price_bin(p: float) -> int:
        return round(p / (p * 0.01)) * round(p * 0.01)  # round to nearest 1%

    def bin_key(asset: str, target: float) -> tuple:
        # Round to nearest 1% of the target price for fuzzy matching
        rounded = round(target / max(target * 0.01, 1)) * max(round(target * 0.01), 1)
        return (asset, rounded)

    kalshi_by_key: dict = {}
    for km in kalshi_markets:
        parsed = _parse_kalshi_market(km)
        if not parsed:
            continue
        key = bin_key(parsed["asset"], parsed["targetPrice"])
        kalshi_by_key[key] = parsed  # last one wins if there are duplicates

    opps: list = []
    for pm in poly_markets:
        question = pm.get("question", "")
        q_lower = question.lower()
        asset = _asset_from_text(q_lower)
        if not asset:
            continue

        upside_keywords = ["reach", "hit", "exceed", "above", "surpass", "break"]
        if not any(w in q_lower for w in upside_keywords):
            continue

        target = _parse_dollar_amount(question)
        if not target or target < 100:
            continue

        poly_yes = _poly_yes_price(pm)
        poly_no = _poly_no_price(pm)
        if poly_yes is None or poly_yes <= 0:
            continue

        key = bin_key(asset, target)
        km_parsed = kalshi_by_key.get(key)
        if not km_parsed:
            continue

        k_yes = km_parsed["yesPrice"]
        k_no = km_parsed["noPrice"]

        # Determine which platform has the cheaper YES and build the two legs
        if poly_yes < k_yes:
            # Poly YES cheaper → buy YES on Poly, buy NO on Kalshi
            leg1 = {"venue": "Polymarket", "url": _poly_url(pm), "outcome": "YES", "price": poly_yes}
            leg2 = {"venue": "Kalshi", "url": km_parsed["url"], "outcome": "NO", "price": k_no}
            profit = k_yes - poly_yes  # guaranteed P&L per unit regardless of outcome
        elif k_yes < poly_yes:
            # Kalshi YES cheaper → buy YES on Kalshi, buy NO on Poly
            if poly_no is None or poly_no <= 0:
                continue
            leg1 = {"venue": "Kalshi", "url": km_parsed["url"], "outcome": "YES", "price": k_yes}
            leg2 = {"venue": "Polymarket", "url": _poly_url(pm), "outcome": "NO", "price": poly_no}
            profit = poly_yes - k_yes
        else:
            continue  # no spread

        profit_margin = profit / (leg1["price"] + leg2["price"]) * 100
        if profit_margin < MIN_PROFIT_MARGIN:
            continue

        volume = _poly_volume(pm) + km_parsed["volume"]
        cond_id = f"cross:{pm.get('conditionId', '')}+{km_parsed['ticker']}"

        opps.append({
            "id": str(uuid.uuid4()),
            "type": "cross_venue",
            "market": question,
            "conditionId": cond_id,
            "asset": asset,
            "targetPrice": target,
            "leg1Venue": leg1["venue"],
            "leg1Url": leg1["url"],
            "leg1Outcome": leg1["outcome"],
            "leg1Price": round(leg1["price"], 4),
            "leg2Venue": leg2["venue"],
            "leg2Url": leg2["url"],
            "leg2Outcome": leg2["outcome"],
            "leg2Price": round(leg2["price"], 4),
            "spread": round(profit, 4),
            "profitMargin": round(profit_margin, 2),
            "confidence": round(_confidence(profit_margin, volume), 1),
            "status": "pending",
            "detectedAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        })

    return opps


def is_duplicate(new_opp: dict, existing: list) -> bool:
    cond_id = new_opp.get("conditionId", "")
    side = new_opp.get("side")
    for opp in existing:
        if opp["status"] != "pending":
            continue
        if opp.get("conditionId") == cond_id:
            if new_opp.get("type") == "oracle":
                # oracle opps are per-side
                if opp.get("side") == side:
                    return True
            else:
                return True  # cross_venue conditionId is already unique per pair
    return False


# ---------------------------------------------------------------------------
# Telegram
# ---------------------------------------------------------------------------

async def send_telegram(session: aiohttp.ClientSession, text: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("  [Telegram] not configured — skipping")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    try:
        async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status != 200:
                print(f"  [Telegram] {resp.status}: {(await resp.text())[:200]}")
    except Exception as e:
        print(f"  [Telegram] {e}")


def format_oracle_alert(opp: dict) -> str:
    emoji = "🟢" if opp["side"] == "YES" else "🔴"
    return (
        f"<b>{emoji} Oracle Signal — Buy {opp['side']} on Polymarket</b>\n\n"
        f"<b>Market:</b> {opp['market']}\n\n"
        f"<b>{opp['asset']} oracle:</b> ${opp['oraclePrice']:,.0f}\n"
        f"<b>Target price:</b> ${opp['targetPrice']:,.0f}\n"
        f"<b>Current {opp['side']} price:</b> {opp['marketOdds']*100:.1f}¢\n"
        f"<b>Expected profit:</b> +{opp['profitMargin']:.1f}%\n"
        f"<b>Confidence:</b> {opp['confidence']:.0f}%\n\n"
        f"👉 <a href=\"{opp['marketUrl']}\">Open on Polymarket</a>"
    )


def format_cross_venue_alert(opp: dict) -> str:
    total_cost = opp["leg1Price"] + opp["leg2Price"]
    return (
        f"<b>🔀 Cross-Venue Arbitrage — Locked Profit +{opp['profitMargin']:.1f}%</b>\n\n"
        f"<b>Market:</b> {opp['market']}\n\n"
        f"<b>Leg 1:</b> Buy {opp['leg1Outcome']} on {opp['leg1Venue']} @ {opp['leg1Price']*100:.1f}¢\n"
        f"<b>Leg 2:</b> Buy {opp['leg2Outcome']} on {opp['leg2Venue']} @ {opp['leg2Price']*100:.1f}¢\n\n"
        f"<b>Combined cost:</b> {total_cost*100:.1f}¢ → pays $1.00 regardless of outcome\n"
        f"<b>Profit:</b> {opp['spread']*100:.1f}¢ per unit ({opp['profitMargin']:.1f}%)\n"
        f"<b>Confidence:</b> {opp['confidence']:.0f}%\n\n"
        f"👉 <a href=\"{opp['leg1Url']}\">Leg 1 — {opp['leg1Venue']}</a>\n"
        f"👉 <a href=\"{opp['leg2Url']}\">Leg 2 — {opp['leg2Venue']}</a>"
    )


def format_alert(opp: dict) -> str:
    if opp.get("type") == "cross_venue":
        return format_cross_venue_alert(opp)
    return format_oracle_alert(opp)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

async def poll_once(session: aiohttp.ClientSession, kalshi_token: Optional[str]) -> Optional[str]:
    """Run one poll cycle. Returns (possibly refreshed) kalshi token."""
    global _kalshi_token
    now = datetime.now(timezone.utc).isoformat()
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Scanning...")

    # Pyth prices
    try:
        prices = await fetch_pyth_prices(session)
        btc = prices.get("BTC", {}).get("price", 0)
        eth = prices.get("ETH", {}).get("price", 0)
        print(f"  Pyth   — BTC: ${btc:,.0f}  ETH: ${eth:,.0f}")
    except Exception as e:
        print(f"  Pyth fetch failed: {e}")
        return kalshi_token

    # Polymarket
    poly_markets = await fetch_polymarket_markets(session)
    print(f"  Poly   — {len(poly_markets)} markets")

    # Kalshi (optional)
    kalshi_markets: list = []
    if kalshi_token:
        kalshi_markets = await fetch_kalshi_markets(session, kalshi_token)
        if not kalshi_markets and KALSHI_EMAIL:
            # Token may have expired — re-login once
            print("  Kalshi — token expired, re-logging in")
            kalshi_token = await kalshi_login(session)
            if kalshi_token:
                kalshi_markets = await fetch_kalshi_markets(session, kalshi_token)
        print(f"  Kalshi — {len(kalshi_markets)} markets")
    elif KALSHI_EMAIL:
        print("  Kalshi — no token (login failed earlier)")

    data = load_data()
    existing = data["opportunities"]
    new_opps: list = []

    # Oracle mismatch opportunities
    for m in poly_markets:
        opp = detect_oracle_opportunity(m, prices)
        if opp and not is_duplicate(opp, existing):
            new_opps.append(opp)

    # Cross-venue opportunities (only when Kalshi is available)
    if kalshi_markets:
        cross = detect_cross_venue_opportunities(poly_markets, kalshi_markets)
        for opp in cross:
            if not is_duplicate(opp, existing):
                new_opps.append(opp)

    data["lastScanAt"] = now

    if new_opps:
        print(f"  {len(new_opps)} new opportunity(s)!")
        for opp in new_opps:
            if opp["type"] == "cross_venue":
                print(f"    [CROSS] {opp['leg1Outcome']}@{opp['leg1Venue']} + {opp['leg2Outcome']}@{opp['leg2Venue']}  +{opp['profitMargin']:.1f}%  {opp['market'][:50]}")
            else:
                print(f"    [ORACLE] {opp['side']} @ {opp['marketOdds']*100:.1f}¢  +{opp['profitMargin']:.1f}%  {opp['market'][:50]}")
            await send_telegram(session, format_alert(opp))
        existing.extend(new_opps)
    else:
        print("  No new opportunities")

    data["opportunities"] = existing
    save_data(data)
    return kalshi_token


async def main():
    print("Polytrage Poller")
    print(f"  Min profit margin : {MIN_PROFIT_MARGIN}%")
    print(f"  Scan interval     : {SCAN_INTERVAL}s")
    print(f"  Telegram          : {'configured' if TELEGRAM_BOT_TOKEN else 'NOT configured'}")
    print(f"  Kalshi            : {'configured' if KALSHI_EMAIL else 'NOT configured (cross-venue disabled)'}")
    print(f"  Data file         : {DATA_FILE}")

    async with aiohttp.ClientSession() as session:
        # Kalshi login at startup
        token = await kalshi_login(session) if KALSHI_EMAIL else None

        while True:
            try:
                token = await poll_once(session, token)
            except Exception as e:
                print(f"  Unexpected error: {e}")
            await asyncio.sleep(SCAN_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
