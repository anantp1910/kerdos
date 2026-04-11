"""
Feature Engineering Module for NQ Futures Microtrading Strategy
PSU Quant Club

This module takes raw NQ tick data (parquet files) and produces
a DataFrame of features at a configurable bar frequency (default 1-minute).

Features implemented:
  1. OHLCV bars from tick data
  2. Net Delta (buy vol - sell vol)
  3. Delta % (net delta / total volume)
  4. Point of Control (POC) - price with highest volume
  5. Close vs POC (close - POC, normalized)
  6. Buy/Sell imbalances
  7. Volume profile skew (volume concentration top vs bottom of bar)
  8. Delta divergence signal
  9. VWAP and distance from VWAP
  10. Cumulative delta (rolling windows)
  11. Volatility (rolling std of returns, ATR)
  12. Momentum / directionality
  13. Session context (distance from session high/low)
  14. Order flow toxicity (VPIN-inspired)

Usage:
    from features import FeatureEngine
    engine = FeatureEngine(data_dir="data/")
    df = engine.run()  # returns DataFrame with all features
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional
import warnings

warnings.filterwarnings("ignore")


# ──────────────────────────────────────────────────────────────
# STEP 1: Data Loading
# ──────────────────────────────────────────────────────────────

def load_tick_data(data_dir: str, start_date: str = None, end_date: str = None) -> pd.DataFrame:
    """
    Load all parquet tick files from the data directory.
    
    Expected columns in parquet files (adjust if your schema differs):
        - timestamp (or datetime): tick timestamp
        - price: trade price
        - size/volume: trade size
        - side: 'buy'/'sell' or 1/-1 (trade aggressor side)
    
    If your data doesn't have a 'side' column, we'll infer it using
    tick rule (compare price to previous price).
    """
    data_path = Path(data_dir)
    files = sorted(data_path.glob("nq_ticks_*.parquet"))
    
    if not files:
        raise FileNotFoundError(f"No parquet files found in {data_dir}")
    
    print(f"Found {len(files)} parquet files")
    
    dfs = []
    for f in files:
        # Optional date filtering based on filename
        date_str = f.stem.replace("nq_ticks_", "")
        if start_date and date_str < start_date:
            continue
        if end_date and date_str > end_date:
            continue
        
        df = pd.read_parquet(f)
        dfs.append(df)
        
    data = pd.concat(dfs, ignore_index=True)
    print(f"Loaded {len(data):,} ticks")
    return data


def normalize_tick_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize column names and ensure we have:
        - timestamp (datetime index)
        - price (float)
        - size (int/float) 
        - side (1 for buy, -1 for sell)
    
    *** IMPORTANT: You'll likely need to adjust this function ***
    *** based on the actual columns in Jonathan's Bloomberg data ***
    """
    df = df.copy()
    
    # --- Column name mapping (adjust to match your actual data) ---
    # Common Bloomberg tick data columns:
    col_map = {
        # timestamp variants
        "datetime": "timestamp",
        "date": "timestamp",
        "time": "timestamp",
        "Time": "timestamp",
        "DateTime": "timestamp",
        "TIMESTAMP": "timestamp",
        
        # price variants
        "Price": "price",
        "PRICE": "price",
        "trade_price": "price",
        "last": "price",
        "Last": "price",
        "px": "price",
        
        # size variants  
        "Size": "size",
        "SIZE": "size",
        "volume": "size",
        "Volume": "size",
        "qty": "size",
        "trade_size": "size",
        
        # side variants
        "Side": "side",
        "SIDE": "side",
        "aggressor": "side",
        "direction": "side",
        "type": "side",
        "Type": "side",
    }
    
    df.rename(columns={k: v for k, v in col_map.items() if k in df.columns}, inplace=True)
    
    # Ensure timestamp is datetime
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    elif df.index.dtype == "datetime64[ns]":
        df = df.reset_index()
        df.rename(columns={df.columns[0]: "timestamp"}, inplace=True)
    else:
        raise ValueError(
            f"Cannot find timestamp column. Available columns: {list(df.columns)}\n"
            "Please update the col_map in normalize_tick_data()"
        )
    
    # Ensure required columns exist
    for col in ["price", "size"]:
        if col not in df.columns:
            raise ValueError(
                f"Missing '{col}' column. Available: {list(df.columns)}\n"
                "Please update the col_map in normalize_tick_data()"
            )
    
    # Infer side using tick rule if not present
    if "side" not in df.columns:
        print("No 'side' column found — inferring trade aggressor using tick rule")
        df["side"] = infer_trade_side(df["price"])
    else:
        # Normalize side to 1/-1
        side_map = {"buy": 1, "sell": -1, "B": 1, "S": -1, "b": 1, "s": -1}
        if df["side"].dtype == object:
            df["side"] = df["side"].map(side_map).fillna(0).astype(int)
    
    df = df.sort_values("timestamp").reset_index(drop=True)
    return df[["timestamp", "price", "size", "side"]]


def infer_trade_side(prices: pd.Series) -> pd.Series:
    """
    Tick rule: if price > previous price, it's a buy (aggressor buying at ask).
    If price < previous, it's a sell. If equal, inherit the previous classification.
    """
    diff = prices.diff()
    side = pd.Series(0, index=prices.index)
    side[diff > 0] = 1
    side[diff < 0] = -1
    # Forward fill for zero changes (unchanged tick rule)
    side.replace(0, np.nan, inplace=True)
    side = side.ffill().fillna(1).astype(int)
    return side


# ──────────────────────────────────────────────────────────────
# STEP 2: Resample to Bars
# ──────────────────────────────────────────────────────────────

def build_bars(ticks: pd.DataFrame, freq: str = "1min") -> pd.DataFrame:
    """
    Resample tick data into OHLCV bars with buy/sell volume split.
    
    Args:
        ticks: normalized tick DataFrame
        freq: bar frequency ('1min', '5min', '1s', etc.)
    
    Returns:
        DataFrame indexed by bar timestamp with OHLCV + buy_vol + sell_vol
    """
    ticks = ticks.set_index("timestamp")
    
    bars = pd.DataFrame()
    bars["open"] = ticks["price"].resample(freq).first()
    bars["high"] = ticks["price"].resample(freq).max()
    bars["low"] = ticks["price"].resample(freq).min()
    bars["close"] = ticks["price"].resample(freq).last()
    bars["volume"] = ticks["size"].resample(freq).sum()
    bars["trade_count"] = ticks["size"].resample(freq).count()
    
    # Buy/sell volume split
    ticks["buy_vol"] = ticks["size"].where(ticks["side"] == 1, 0)
    ticks["sell_vol"] = ticks["size"].where(ticks["side"] == -1, 0)
    bars["buy_vol"] = ticks["buy_vol"].resample(freq).sum()
    bars["sell_vol"] = ticks["sell_vol"].resample(freq).sum()
    
    # Drop empty bars (e.g., outside trading hours)
    bars = bars.dropna(subset=["open"])
    bars = bars[bars["volume"] > 0]
    
    return bars


# ──────────────────────────────────────────────────────────────
# STEP 3: Volume Footprint Features
# ──────────────────────────────────────────────────────────────

def compute_footprint_features(ticks: pd.DataFrame, bars: pd.DataFrame, 
                                freq: str = "1min", price_tick: float = 0.25) -> pd.DataFrame:
    """
    Compute Volume Footprint-derived features for each bar.
    
    NQ tick size is 0.25 points.
    
    Features:
        - poc: Point of Control (price level with most volume)
        - close_vs_poc: (close - poc) / bar_range — positive = closed above POC
        - delta: net delta (buy_vol - sell_vol) 
        - delta_pct: delta / volume * 100
        - imbalance_buy: count of price levels where buy > 3x sell
        - imbalance_sell: count of price levels where sell > 3x buy
        - vol_skew: (volume in upper half - volume in lower half) / total volume
        - absorption_score: detects absorption (high delta one side, price goes other way)
    """
    # ── VECTORIZED FOOTPRINT (replaces slow iterrows loop) ──────
    # Assign each tick to its bar using merge_asof (O(N log N) instead of O(N*B))
    ticks_sorted = ticks.sort_values("timestamp").copy()
    bars_reset = bars.reset_index()[["timestamp"]].rename(columns={"timestamp": "bar_time"})
    bars_reset = bars_reset.sort_values("bar_time")

    merged = pd.merge_asof(
        ticks_sorted,
        bars_reset,
        left_on="timestamp",
        right_on="bar_time",
        direction="backward",
    )
    # Drop ticks that fall before the first bar
    merged = merged.dropna(subset=["bar_time"])

    # Round price to tick grid
    merged["price_level"] = (merged["price"] / price_tick).round() * price_tick

    # ── POC: price level with highest total volume per bar ──────
    vol_by_level = (
        merged.groupby(["bar_time", "price_level"])["size"]
        .sum()
        .reset_index(name="vol")
    )
    poc_series = (
        vol_by_level.loc[vol_by_level.groupby("bar_time")["vol"].idxmax()]
        .set_index("bar_time")["price_level"]
    )
    bars["poc"] = poc_series.reindex(bars.index).fillna(bars["close"]).values

    # ── Imbalances ───────────────────────────────────────────────
    buy_by_level = (
        merged[merged["side"] == 1]
        .groupby(["bar_time", "price_level"])["size"]
        .sum()
        .rename("buy")
    )
    sell_by_level = (
        merged[merged["side"] == -1]
        .groupby(["bar_time", "price_level"])["size"]
        .sum()
        .rename("sell")
    )
    combined = (
        vol_by_level.set_index(["bar_time", "price_level"])
        .join(buy_by_level, how="left")
        .join(sell_by_level, how="left")
        .fillna(0)
    )
    min_vol = 1
    imb_buy_counts = (
        (combined["buy"] > 3 * combined["sell"].clip(lower=min_vol))
        .groupby(level="bar_time")
        .sum()
    )
    imb_sell_counts = (
        (combined["sell"] > 3 * combined["buy"].clip(lower=min_vol))
        .groupby(level="bar_time")
        .sum()
    )
    bars["imbalance_buy"] = imb_buy_counts.reindex(bars.index).fillna(0).values
    bars["imbalance_sell"] = imb_sell_counts.reindex(bars.index).fillna(0).values

    # ── Volume skew: upper vs lower half of bar ──────────────────
    mid_prices = ((bars["high"] + bars["low"]) / 2).rename("mid")
    vbl2 = vol_by_level.join(mid_prices, on="bar_time")
    upper = vbl2[vbl2["price_level"] >= vbl2["mid"]].groupby("bar_time")["vol"].sum()
    lower = vbl2[vbl2["price_level"] < vbl2["mid"]].groupby("bar_time")["vol"].sum()
    total = (upper + lower).replace(0, np.nan)
    vol_skew = ((upper - lower) / total).reindex(bars.index).fillna(0)
    bars["vol_skew"] = vol_skew.values
    
    # Delta features (these come directly from buy/sell vol already in bars)
    bars["delta"] = bars["buy_vol"] - bars["sell_vol"]
    bars["delta_pct"] = (bars["delta"] / bars["volume"] * 100).replace([np.inf, -np.inf], 0)
    
    # Close vs POC: positive means closed above POC (bullish)
    bar_range = bars["high"] - bars["low"]
    bars["close_vs_poc"] = np.where(
        bar_range > 0,
        (bars["close"] - bars["poc"]) / bar_range,
        0
    )
    
    # Absorption signal (Jeremy's key insight from the screenshots):
    # Negative delta but price closes in upper portion = bullish absorption
    # Positive delta but price closes in lower portion = bearish absorption
    close_position = np.where(
        bar_range > 0,
        (bars["close"] - bars["low"]) / bar_range,
        0.5
    )
    bars["close_position"] = close_position  # 0 = closed at low, 1 = closed at high
    
    # Absorption score: ranges from -1 (bearish absorption) to +1 (bullish absorption)
    # Bullish absorption: sellers dominate (neg delta) but price holds up
    # Bearish absorption: buyers dominate (pos delta) but price drops
    delta_norm = bars["delta_pct"] / 100  # normalize to [-1, 1] ish
    bars["absorption"] = close_position - 0.5 - delta_norm * 0.5
    
    return bars


# ──────────────────────────────────────────────────────────────
# STEP 4: VWAP Features
# ──────────────────────────────────────────────────────────────

def compute_vwap_features(bars: pd.DataFrame) -> pd.DataFrame:
    """
    Session VWAP and distance from VWAP.
    Resets at each new trading session (date change).
    """
    bars = bars.copy()
    bars["date"] = bars.index.date
    
    # Cumulative VWAP per session
    bars["cum_vol"] = bars.groupby("date")["volume"].cumsum()
    bars["cum_pv"] = bars.groupby("date").apply(
        lambda x: (x["close"] * x["volume"]).cumsum()
    ).droplevel(0)
    bars["vwap"] = bars["cum_pv"] / bars["cum_vol"]
    
    # Distance from VWAP (in points and normalized)
    bars["dist_vwap"] = bars["close"] - bars["vwap"]
    bars["dist_vwap_pct"] = bars["dist_vwap"] / bars["vwap"] * 100
    
    # VWAP bands (1 and 2 std dev)
    # Rolling std of (close - vwap) within session
    bars["vwap_dev"] = bars.groupby("date")["dist_vwap"].transform(
        lambda x: x.expanding().std()
    )
    bars["vwap_upper1"] = bars["vwap"] + bars["vwap_dev"]
    bars["vwap_lower1"] = bars["vwap"] - bars["vwap_dev"]
    bars["vwap_upper2"] = bars["vwap"] + 2 * bars["vwap_dev"]
    bars["vwap_lower2"] = bars["vwap"] - 2 * bars["vwap_dev"]
    
    # Clean up temp columns
    bars.drop(columns=["cum_vol", "cum_pv", "date"], inplace=True)
    
    return bars


# ──────────────────────────────────────────────────────────────
# STEP 5: Cumulative Delta Features
# ──────────────────────────────────────────────────────────────

def compute_cumulative_delta(bars: pd.DataFrame, windows: list = [5, 15, 30, 60]) -> pd.DataFrame:
    """
    Rolling cumulative delta over various windows.
    Also computes cumulative delta divergence from price.
    """
    bars = bars.copy()
    
    # Session cumulative delta
    date_col = bars.index.date
    bars["session_cum_delta"] = bars.groupby(date_col)["delta"].cumsum()
    
    # Rolling cumulative delta
    for w in windows:
        bars[f"cum_delta_{w}"] = bars["delta"].rolling(w).sum()
    
    # Delta momentum: rate of change in cumulative delta
    bars["delta_momentum"] = bars["session_cum_delta"].diff(5)
    
    # Price vs cumulative delta divergence
    # If price making new highs but cum delta falling = bearish divergence
    bars["price_z"] = (bars["close"] - bars["close"].rolling(30).mean()) / bars["close"].rolling(30).std()
    bars["delta_z"] = (bars["session_cum_delta"] - bars["session_cum_delta"].rolling(30).mean()) / bars["session_cum_delta"].rolling(30).std()
    bars["delta_divergence"] = bars["price_z"] - bars["delta_z"]
    
    bars.drop(columns=["price_z", "delta_z"], inplace=True)
    
    return bars


# ──────────────────────────────────────────────────────────────
# STEP 6: Volatility & Momentum Features
# ──────────────────────────────────────────────────────────────

def compute_volatility_momentum(bars: pd.DataFrame) -> pd.DataFrame:
    """
    Volatility and momentum/directionality features.
    """
    bars = bars.copy()
    
    # Returns
    bars["returns"] = bars["close"].pct_change()
    bars["log_returns"] = np.log(bars["close"] / bars["close"].shift(1))
    
    # Volatility: rolling std of returns
    for w in [5, 15, 30, 60]:
        bars[f"volatility_{w}"] = bars["log_returns"].rolling(w).std()
    
    # ATR (Average True Range)
    bars["tr"] = np.maximum(
        bars["high"] - bars["low"],
        np.maximum(
            abs(bars["high"] - bars["close"].shift(1)),
            abs(bars["low"] - bars["close"].shift(1))
        )
    )
    for w in [5, 14, 30]:
        bars[f"atr_{w}"] = bars["tr"].rolling(w).mean()
    
    # Bar range relative to ATR (are bars expanding or contracting?)
    bars["range_vs_atr"] = (bars["high"] - bars["low"]) / bars["atr_14"].replace(0, np.nan)
    
    # Momentum: rate of change
    for w in [5, 15, 30]:
        bars[f"momentum_{w}"] = bars["close"] - bars["close"].shift(w)
        bars[f"roc_{w}"] = bars["close"].pct_change(w) * 100
    
    # Directionality: consecutive up/down bars
    bars["up_bar"] = (bars["close"] > bars["open"]).astype(int)
    bars["consec_up"] = bars["up_bar"].groupby(
        (bars["up_bar"] != bars["up_bar"].shift()).cumsum()
    ).cumsum() * bars["up_bar"]
    bars["consec_down"] = (1 - bars["up_bar"]).groupby(
        ((1 - bars["up_bar"]) != (1 - bars["up_bar"]).shift()).cumsum()
    ).cumsum() * (1 - bars["up_bar"])
    
    # RSI (14-period)
    gains = bars["returns"].clip(lower=0)
    losses = (-bars["returns"]).clip(lower=0)
    avg_gain = gains.rolling(14).mean()
    avg_loss = losses.rolling(14).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    bars["rsi_14"] = 100 - (100 / (1 + rs))
    
    # Moving average features
    for w in [9, 20, 50]:
        bars[f"ema_{w}"] = bars["close"].ewm(span=w, adjust=False).mean()
    
    bars["ema_cross_9_20"] = (bars["ema_9"] - bars["ema_20"]) / bars["atr_14"].replace(0, np.nan)
    
    bars.drop(columns=["tr"], inplace=True)
    
    return bars


# ──────────────────────────────────────────────────────────────
# STEP 7: Session Context Features
# ──────────────────────────────────────────────────────────────

def compute_session_context(bars: pd.DataFrame) -> pd.DataFrame:
    """
    Intraday session context: where is price relative to session range?
    """
    bars = bars.copy()
    date_col = bars.index.date
    
    # Running session high/low
    bars["session_high"] = bars.groupby(date_col)["high"].cummax()
    bars["session_low"] = bars.groupby(date_col)["low"].cummin()
    bars["session_range"] = bars["session_high"] - bars["session_low"]
    
    # Position within session range (0 = at low, 1 = at high)
    bars["session_position"] = np.where(
        bars["session_range"] > 0,
        (bars["close"] - bars["session_low"]) / bars["session_range"],
        0.5
    )
    
    # Distance from session high/low in points
    bars["dist_session_high"] = bars["close"] - bars["session_high"]
    bars["dist_session_low"] = bars["close"] - bars["session_low"]
    
    # Time into session (minutes since open)
    bars["session_minute"] = bars.groupby(date_col).cumcount()
    
    # Session volume profile: cumulative vol vs time (detect if front-loaded)
    bars["session_cum_vol"] = bars.groupby(date_col)["volume"].cumsum()
    
    return bars


# ──────────────────────────────────────────────────────────────
# STEP 8: Order Flow Toxicity (VPIN-inspired)
# ──────────────────────────────────────────────────────────────

def compute_toxicity(bars: pd.DataFrame, n_buckets: int = 50) -> pd.DataFrame:
    """
    Volume-Synchronized Probability of Informed Trading (VPIN).
    Measures order flow toxicity / probability of informed trading.
    """
    bars = bars.copy()
    
    # Simple VPIN approximation using bars
    # VPIN = mean(|buy_vol - sell_vol|) / mean(volume) over n buckets
    abs_delta = abs(bars["delta"])
    
    for w in [20, 50]:
        bars[f"vpin_{w}"] = abs_delta.rolling(w).mean() / bars["volume"].rolling(w).mean()
    
    # Buy/sell pressure ratio
    bars["buy_pressure"] = bars["buy_vol"].rolling(20).sum() / bars["volume"].rolling(20).sum()
    
    # Volume surge detection
    vol_ma = bars["volume"].rolling(20).mean()
    vol_std = bars["volume"].rolling(20).std()
    bars["vol_zscore"] = (bars["volume"] - vol_ma) / vol_std.replace(0, np.nan)
    
    return bars


# ──────────────────────────────────────────────────────────────
# MAIN ENGINE
# ──────────────────────────────────────────────────────────────

class FeatureEngine:
    """
    Main feature engineering pipeline.
    
    Usage:
        engine = FeatureEngine(data_dir="data/")
        df = engine.run()
        df.to_parquet("features.parquet")
    """
    
    def __init__(
        self,
        data_dir: str = "data/",
        bar_freq: str = "1min",
        price_tick: float = 0.25,
        start_date: str = None,
        end_date: str = None,
    ):
        self.data_dir = data_dir
        self.bar_freq = bar_freq
        self.price_tick = price_tick
        self.start_date = start_date
        self.end_date = end_date
    
    def run(self, save_path: Optional[str] = None) -> pd.DataFrame:
        """Run the full feature engineering pipeline."""
        
        # 1. Load raw tick data
        print("=" * 60)
        print("STEP 1: Loading tick data...")
        raw = load_tick_data(self.data_dir, self.start_date, self.end_date)
        
        # 2. Normalize columns
        print("STEP 2: Normalizing tick data...")
        ticks = normalize_tick_data(raw)
        print(f"  Columns: {list(ticks.columns)}")
        print(f"  Date range: {ticks['timestamp'].min()} → {ticks['timestamp'].max()}")
        
        # 3. Build OHLCV bars
        print(f"STEP 3: Building {self.bar_freq} bars...")
        bars = build_bars(ticks, self.bar_freq)
        print(f"  {len(bars):,} bars created")
        
        # 4. Volume footprint features
        print("STEP 4: Computing volume footprint features...")
        bars = compute_footprint_features(ticks, bars, self.bar_freq, self.price_tick)
        
        # 5. VWAP features
        print("STEP 5: Computing VWAP features...")
        bars = compute_vwap_features(bars)
        
        # 6. Cumulative delta
        print("STEP 6: Computing cumulative delta features...")
        bars = compute_cumulative_delta(bars)
        
        # 7. Volatility & momentum
        print("STEP 7: Computing volatility & momentum features...")
        bars = compute_volatility_momentum(bars)
        
        # 8. Session context
        print("STEP 8: Computing session context features...")
        bars = compute_session_context(bars)
        
        # 9. Order flow toxicity
        print("STEP 9: Computing order flow toxicity features...")
        bars = compute_toxicity(bars)
        
        print("=" * 60)
        print(f"DONE! {len(bars):,} bars × {len(bars.columns)} features")
        print(f"\nFeature list:")
        for i, col in enumerate(bars.columns, 1):
            print(f"  {i:2d}. {col}")
        
        if save_path:
            bars.to_parquet(save_path)
            print(f"\nSaved to {save_path}")
        
        return bars


# ──────────────────────────────────────────────────────────────
# RUN
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    engine = FeatureEngine(
        data_dir="data/",      # path to your nq_ticks_*.parquet files
        bar_freq="1min",       # 1-minute bars
        price_tick=0.25,       # NQ tick size
    )
    
    df = engine.run(save_path="nq_features.parquet")
    
    # Quick sanity check
    print("\n" + "=" * 60)
    print("SAMPLE OUTPUT (last 5 rows, key features):")
    key_cols = [
        "open", "high", "low", "close", "volume",
        "delta", "delta_pct", "poc", "close_vs_poc",
        "absorption", "vwap", "dist_vwap",
        "session_cum_delta", "volatility_15",
        "rsi_14", "session_position", "vpin_20"
    ]
    print(df[key_cols].tail())
