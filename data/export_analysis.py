"""
Export nq_features.parquet to per-day JSON files for the Next.js web app.
Run once after features.py: python data/export_analysis.py
"""
import pandas as pd
import numpy as np
import json
from pathlib import Path

COLS = [
    "open", "high", "low", "close", "volume",
    "buy_vol", "sell_vol",
    "vwap", "vwap_upper1", "vwap_lower1", "vwap_upper2", "vwap_lower2",
    "delta", "delta_pct", "session_cum_delta",
    "absorption", "close_vs_poc", "poc",
    "rsi_14", "atr_14", "volatility_15",
    "session_position", "vpin_20", "buy_pressure", "vol_zscore",
    "ema_9", "ema_20",
]

df = pd.read_parquet("nq_features.parquet")
df.index = pd.to_datetime(df.index, utc=True).tz_convert("America/New_York")

out_dir = Path("data/analysis")
out_dir.mkdir(exist_ok=True)

dates = sorted(set(df.index.date))
print(f"Exporting {len(dates)} days...")

summary_rows = []

for d in dates:
    day = df[df.index.date == d].copy()
    # Keep only RTH (09:30–16:00 ET) bars for cleaner charts
    day = day.between_time("09:30", "16:00")
    if len(day) < 10:
        continue

    available = [c for c in COLS if c in day.columns]
    day = day[available].copy()

    # Round floats to 2dp to keep JSON small
    day = day.round(2)
    day = day.replace([np.inf, -np.inf], None)
    day = day.where(pd.notna(day), None)

    records = []
    for ts, row in day.iterrows():
        rec = {"t": ts.strftime("%H:%M")}
        rec.update(row.to_dict())
        records.append(rec)

    date_str = str(d)
    with open(out_dir / f"{date_str}.json", "w") as f:
        json.dump(records, f, separators=(",", ":"))

    # Summary stats for this day
    summary_rows.append({
        "date": date_str,
        "open": float(day["open"].iloc[0]),
        "close": float(day["close"].iloc[-1]),
        "high": float(day["high"].max()),
        "low": float(day["low"].min()),
        "volume": int(day["volume"].sum()),
        "session_cum_delta": float(day["session_cum_delta"].iloc[-1]),
        "avg_absorption": float(day["absorption"].mean().round(3)),
        "avg_vpin": float(day["vpin_20"].mean().round(3)) if "vpin_20" in day else 0,
        "bars": len(day),
    })
    print(f"  {date_str}: {len(day)} bars")

# Write index/summary file
with open(out_dir / "index.json", "w") as f:
    json.dump(summary_rows, f, indent=2)

print(f"\nDone. Exported {len(summary_rows)} days to data/analysis/")
print(f"Latest date: {summary_rows[-1]['date']}")
