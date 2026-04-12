"use client";

import { useEffect, useMemo, useState } from "react";

type Allocation = {
  ticker: string;
  percentage: number;
  description: string;
  annualReturn?: number;
};

type StockData = {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
};

type Point3D = { x: number; y: number; z: number };
type LabelPoint = {
  ticker: string;
  amount: number;
  percentage: number;
  color: string;
  point: Point3D;
};

const SURFACE_COLORS = ["#F9C80E", "#F86624", "#EA3546", "#662E9B", "#43BCCD"];
const ASSET_COLORS = ["#FF5F6D", "#FF9671", "#FFC75F", "#F9F871", "#B8F35D", "#59D4FF", "#C77DFF", "#74F2CE"];

function gradientAt(t: number) {
  const clamped = Math.min(Math.max(t, 0), 1);
  const scaled = clamped * (SURFACE_COLORS.length - 1);
  const left = Math.floor(scaled);
  const right = Math.ceil(scaled);

  if (left === right) return SURFACE_COLORS[left];

  const mix = scaled - left;
  const from = SURFACE_COLORS[left];
  const to = SURFACE_COLORS[right];

  const parse = (hex: string) => ({
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  });

  const start = parse(from);
  const end = parse(to);
  const channel = (a: number, b: number) => Math.round(a + (b - a) * mix);

  return `rgb(${channel(start.r, end.r)}, ${channel(start.g, end.g)}, ${channel(start.b, end.b)})`;
}

function buildProjector(phase: number) {
  const yaw = ((43 + Math.sin(phase * 0.38) * 2.4) * Math.PI) / 180;
  const pitch = ((35 + Math.cos(phase * 0.24) * 1.6) * Math.PI) / 180;

  return (point: Point3D) => {
    const xr = point.x * Math.cos(yaw) - point.y * Math.sin(yaw);
    const yr = point.x * Math.sin(yaw) + point.y * Math.cos(yaw);

    return {
      x: 390 + xr * 92,
      y: 430 - yr * Math.sin(pitch) * 58 - point.z * Math.cos(pitch) * 1.95,
    };
  };
}

function pathFromPoints(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

export default function PortfolioLandscapeChart({
  allocations,
  marketData,
  investableAmount,
  marketStatusLabel,
}: {
  allocations: Allocation[];
  marketData: StockData[];
  investableAmount: number;
  marketStatusLabel: string;
}) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhase((current) => current + 0.07);
    }, 70);

    return () => window.clearInterval(interval);
  }, []);

  const chart = useMemo(() => {
    const project = buildProjector(phase);
    const assets = allocations.slice(0, 8).map((allocation, index) => {
      const live = marketData.find((stock) => stock.ticker === allocation.ticker);
      const annualReturn = allocation.annualReturn ?? 5;
      const changePct = live?.changePct ?? 0;
      const motion = Math.sin(phase * 1.25 + index * 0.9);
      return {
        ...allocation,
        name: live?.name ?? allocation.description,
        amount: (allocation.percentage / 100) * investableAmount,
        color: ASSET_COLORS[index % ASSET_COLORS.length],
        height: Math.max(6, allocation.percentage * 2.6 + annualReturn * 0.8 + changePct * 6 + motion * 0.85),
        x: 0.26 + (index / Math.max(allocations.slice(0, 8).length - 1, 1)) * 0.44,
        y: 0.24 + Math.sin(index * 1.35 + phase * 0.18) * 0.12 + index * 0.03,
      };
    });

    const gridX = 30;
    const gridY = 18;
    const surface: Point3D[][] = [];

    for (let yi = 0; yi < gridY; yi += 1) {
      const row: Point3D[] = [];
      for (let xi = 0; xi < gridX; xi += 1) {
        const x = xi / (gridX - 1);
        const y = yi / (gridY - 1);
        let z =
          Math.sin(x * Math.PI * 1.6 + phase * 0.24) * 2.1 +
          Math.cos(y * Math.PI * 2.2 - phase * 0.16) * 1.6 +
          Math.sin((x + y) * Math.PI * 1.8 + phase * 0.2) * 0.5;

        for (const asset of assets) {
          const dx = x - asset.x;
          const dy = y - asset.y;
          const spread = asset.ticker === "CASH" ? 0.09 : 0.065;
          z += asset.height * Math.exp(-((dx * dx + dy * dy) / (2 * spread * spread)));
        }

        row.push({ x: x * 7.4, y: y * 5.2, z });
      }
      surface.push(row);
    }

    const strips = [];
    for (let yi = 0; yi < gridY - 1; yi += 1) {
      const top = surface[yi].map(project);
      const bottom = [...surface[yi + 1]].reverse().map(project);
      strips.push({
        d: `${pathFromPoints([...top, ...bottom])} Z`,
        color: gradientAt(yi / (gridY - 2)),
      });
    }

    const horizontalLines = surface.map((row) => pathFromPoints(row.map(project)));
    const verticalLines = Array.from({ length: gridX }, (_, xi) => pathFromPoints(surface.map((row) => project(row[xi]))));

    const labels: LabelPoint[] = assets.map((asset) => {
      const center = {
        x: asset.x * 7.4,
        y: asset.y * 5.2,
        z: asset.height + 3,
      };
      return {
        ticker: asset.ticker,
        amount: asset.amount,
        percentage: asset.percentage,
        color: asset.color,
        point: center,
      };
    });

    const summit = labels.reduce((highest, current) => (current.point.z > highest.point.z ? current : highest), labels[0] ?? {
      ticker: "RV",
      amount: 0,
      percentage: 0,
      color: "#ffffff",
      point: { x: 3.6, y: 2.6, z: 10 },
    });

    return { strips, horizontalLines, verticalLines, labels, summit, project };
  }, [allocations, investableAmount, marketData, phase]);

  return (
    <div
      className="relative overflow-hidden rounded-[22px] border p-5"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 30%), linear-gradient(180deg, #040506 0%, #080910 100%)",
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-white/45">Allocation Landscape</p>
          <p className="text-sm font-semibold text-white mt-1">
            A 3D risk surface shaped by your live portfolio weights, expected return, and market move
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-white/80">{marketStatusLabel}</p>
          <p className="text-[11px] text-white/45">${investableAmount.toFixed(2)} ready to deploy</p>
        </div>
      </div>

      <div className="relative rounded-[20px] border border-white/6 bg-black/40 p-3">
        <svg viewBox="0 0 1200 620" className="w-full h-auto">
          {chart.strips.map((strip, index) => (
            <path key={`strip-${index}`} d={strip.d} fill={strip.color} opacity={0.12} stroke="none" />
          ))}

          {chart.horizontalLines.map((line, index) => (
            <path key={`h-${index}`} d={line} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          ))}
          {chart.verticalLines.map((line, index) => (
            <path key={`v-${index}`} d={line} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
          ))}

          {chart.labels.map((label) => {
            const projected = chart.project(label.point);
            return (
              <g key={label.ticker}>
                <line
                  x1={projected.x}
                  y1={projected.y + 4}
                  x2={projected.x}
                  y2={projected.y + 68}
                  stroke={label.color}
                  strokeOpacity="0.65"
                  strokeWidth="2"
                />
                <circle cx={projected.x} cy={projected.y} r="17" fill={label.color} fillOpacity="0.72" stroke="white" strokeOpacity="0.35" />
                <text x={projected.x} y={projected.y + 5} fill="white" fontSize="18" fontWeight="700" textAnchor="middle">
                  {label.ticker}
                </text>
              </g>
            );
          })}

          {(() => {
            const summit = chart.project({ ...chart.summit.point, z: chart.summit.point.z + 12 });
            const wave = Math.sin(phase * 1.4) * 6;
            return (
              <g>
                <line x1={summit.x} y1={summit.y + 10} x2={summit.x} y2={summit.y + 95} stroke="rgba(255,255,255,0.8)" strokeWidth="3" />
                <path
                  d={`M ${summit.x} ${summit.y} Q ${summit.x + 42} ${summit.y + wave} ${summit.x + 96} ${summit.y + 12} L ${summit.x + 96} ${summit.y + 62} Q ${summit.x + 46} ${summit.y + 58 + wave * 0.35} ${summit.x} ${summit.y + 50} Z`}
                  fill="rgba(255,255,255,0.95)"
                  stroke="rgba(255,255,255,0.25)"
                />
                <circle cx={summit.x + 48} cy={summit.y + 31} r="22" fill="#232533" />
                <text x={summit.x + 48} y={summit.y + 38} textAnchor="middle" fill="white" fontWeight="700" fontSize="18">
                  RV
                </text>
              </g>
            );
          })()}

          <line x1="940" y1="192" x2="940" y2="454" stroke="#FF5F6D" strokeWidth="3" strokeOpacity="0.8" />
          {chart.labels.map((label, index) => (
            <g key={`legend-${label.ticker}`}>
              <line
                x1="940"
                y1={206 + index * 30}
                x2="968"
                y2={206 + index * 30}
                stroke={label.color}
                strokeWidth="2"
                strokeDasharray="2 6"
              />
              <text x="982" y={211 + index * 30} fill={label.color} fontSize="20" fontWeight="700">
                {label.ticker}: ${label.amount.toFixed(0)} ({label.percentage}%)
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
