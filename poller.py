#!/usr/bin/env python3
"""
Polytrage Poller

Polls Pyth oracle prices and Polymarket prediction markets, detects arbitrage
opportunities, sends Telegram alerts, and writes results to data/opportunities.json
so the Next.js dashboard can display them.

Usage:
    pip install -r requirements.txt
    cp .env.example .env.local
    # fill in TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
    python poller.py
"""

import asyncio
import json
import os
import re
import time
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

    prices = {}
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
    params = {
        "active": "true",
        "closed": "false",
        "limit": 100,
        "tag_slug": "crypto",
    }
    try:
        async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                print(f"  Polymarket API returned {resp.status}")
                return []
            data = await resp.json()
            return data if isinstance(data, list) else data.get("markets", [])
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


def detect_opportunity(market: dict, prices: dict) -> Optional[dict]:
    """
    Look for a mispricing between oracle price and market odds.

    Strategy:
      - For "Will BTC/ETH reach $X?" markets:
          If oracle is already above $X → YES is underpriced
          If oracle is well below $X  → NO is underpriced
    """
    question = market.get("question", "")
    q_lower = question.lower()

    # Identify asset
    if "bitcoin" in q_lower or " btc" in q_lower:
        asset = "BTC"
    elif "ethereum" in q_lower or " eth" in q_lower:
        asset = "ETH"
    else:
        return None

    if asset not in prices:
        return None

    # Only handle "reach $X" style questions
    upside_keywords = ["reach", "hit", "exceed", "above", "surpass", "break"]
    if not any(w in q_lower for w in upside_keywords):
        return None

    target_price = _parse_dollar_amount(question)
    if not target_price or target_price < 100:
        return None

    oracle_price = prices[asset]["price"]

    # Find YES/NO token prices (0–1 scale on Polymarket)
    yes_price: Optional[float] = None
    no_price: Optional[float] = None
    for token in market.get("tokens", []):
        outcome = token.get("outcome", "").upper()
        raw = token.get("price", 0)
        try:
            p = float(raw)
        except (TypeError, ValueError):
            continue
        # Gamma API sometimes returns 0–100, normalise to 0–1
        if p > 1:
            p = p / 100
        if outcome == "YES":
            yes_price = p
        elif outcome == "NO":
            no_price = p

    if yes_price is None or yes_price <= 0:
        return None

    ratio = oracle_price / target_price

    if ratio >= 1.0:
        # Oracle already past target — YES should be close to 1
        fair_yes = 0.92
        if yes_price >= fair_yes - 0.04:
            return None
        trade_side = "YES"
        trade_price = yes_price
        profit_margin = (fair_yes - yes_price) / yes_price * 100
    elif ratio <= 0.80:
        # Oracle well below target — NO should be cheap to buy
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

    volume = 0.0
    for v_field in ("volumeNum", "volume", "liquidityNum", "liquidity"):
        try:
            volume = float(market.get(v_field) or 0)
            if volume > 0:
                break
        except (TypeError, ValueError):
            pass

    confidence = 50.0
    if volume > 1_000_000:
        confidence += 20
    elif volume > 100_000:
        confidence += 10
    if profit_margin > 15:
        confidence += 25
    elif profit_margin > 8:
        confidence += 15
    elif profit_margin > 4:
        confidence += 5
    confidence = min(confidence, 95)

    slug = market.get("slug", market.get("conditionId", ""))
    market_url = (
        f"https://polymarket.com/event/{slug}"
        if slug and not slug.startswith("0x")
        else "https://polymarket.com"
    )

    return {
        "id": str(uuid.uuid4()),
        "market": question,
        "marketUrl": market_url,
        "conditionId": market.get("conditionId", market.get("id", "")),
        "asset": asset,
        "side": trade_side,
        "marketOdds": round(trade_price, 4),
        "oraclePrice": round(oracle_price, 2),
        "targetPrice": target_price,
        "profitMargin": round(profit_margin, 2),
        "confidence": round(confidence, 1),
        "status": "pending",
        "detectedAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }


def is_duplicate(new_opp: dict, existing: list) -> bool:
    for opp in existing:
        if (
            opp["status"] == "pending"
            and opp.get("conditionId") == new_opp.get("conditionId")
            and opp["side"] == new_opp["side"]
        ):
            return True
    return False


# ---------------------------------------------------------------------------
# Telegram
# ---------------------------------------------------------------------------

async def send_telegram(session: aiohttp.ClientSession, text: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("  [Telegram] not configured — skipping notification")
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
                body = await resp.text()
                print(f"  [Telegram] error {resp.status}: {body[:200]}")
    except Exception as e:
        print(f"  [Telegram] request failed: {e}")


def format_alert(opp: dict) -> str:
    side_emoji = "🟢" if opp["side"] == "YES" else "🔴"
    return (
        f"<b>{side_emoji} Trade Signal: Buy {opp['side']}</b>\n\n"
        f"<b>Market:</b> {opp['market']}\n\n"
        f"<b>{opp['asset']} oracle:</b> ${opp['oraclePrice']:,.0f}\n"
        f"<b>Target price:</b> ${opp['targetPrice']:,.0f}\n"
        f"<b>Current {opp['side']} price:</b> {opp['marketOdds']*100:.1f}¢\n"
        f"<b>Expected profit:</b> +{opp['profitMargin']:.1f}%\n"
        f"<b>Confidence:</b> {opp['confidence']:.0f}%\n\n"
        f"👉 <a href=\"{opp['marketUrl']}\">Place trade on Polymarket</a>"
    )


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

async def poll_once(session: aiohttp.ClientSession):
    now = datetime.now(timezone.utc).isoformat()
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Scanning...")

    try:
        prices = await fetch_pyth_prices(session)
        btc = prices.get("BTC", {}).get("price", 0)
        eth = prices.get("ETH", {}).get("price", 0)
        print(f"  Pyth  — BTC: ${btc:,.0f}  ETH: ${eth:,.0f}")
    except Exception as e:
        print(f"  Pyth fetch failed: {e}")
        return

    markets = await fetch_polymarket_markets(session)
    print(f"  Polymarket — {len(markets)} markets fetched")

    data = load_data()
    existing = data["opportunities"]
    new_opps = []

    for m in markets:
        opp = detect_opportunity(m, prices)
        if opp and not is_duplicate(opp, existing):
            new_opps.append(opp)

    data["lastScanAt"] = now

    if new_opps:
        print(f"  {len(new_opps)} new opportunity(s)!")
        for opp in new_opps:
            print(f"    {opp['side']} @ {opp['marketOdds']*100:.1f}¢  +{opp['profitMargin']:.1f}%  {opp['market'][:60]}")
            await send_telegram(session, format_alert(opp))
        existing.extend(new_opps)
    else:
        print("  No new opportunities")

    data["opportunities"] = existing
    save_data(data)


async def main():
    print("Polytrage Poller")
    print(f"  Min profit margin : {MIN_PROFIT_MARGIN}%")
    print(f"  Scan interval     : {SCAN_INTERVAL}s")
    print(f"  Telegram          : {'configured' if TELEGRAM_BOT_TOKEN else 'NOT configured (set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)'}")
    print(f"  Data file         : {DATA_FILE}")

    async with aiohttp.ClientSession() as session:
        while True:
            try:
                await poll_once(session)
            except Exception as e:
                print(f"  Unexpected error: {e}")
            await asyncio.sleep(SCAN_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
