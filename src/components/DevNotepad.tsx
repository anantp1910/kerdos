"use client";

import { useState } from "react";

const NOTES: { heading: string; color: string; items: { label: string; status: "done" | "progress" | "todo" }[] }[] = [
  {
    heading: "Plaid",
    color: "#4ade80",
    items: [
      { label: "Sandbox account + keys", status: "done" },
      { label: "API route returning transactions", status: "done" },
      { label: "Wire transactions to SmartSwipe UI", status: "todo" },
    ],
  },
  {
    heading: "SmartSwipe",
    color: "#4ade80",
    items: [
      { label: "UI built (mock data)", status: "done" },
      { label: "Cleared for rebuild", status: "done" },
      { label: "Connect rewardscc.com reward rates", status: "done" },
      { label: "Build SmartSwipe UI + algorithm", status: "progress" },
    ],
  },
  {
    heading: "RewardVest",
    color: "#60a5fa",
    items: [
      { label: "UI built (mock data)", status: "done" },
      { label: "Alpha Vantage market data", status: "todo" },
      { label: "OpenAI investment suggestion", status: "todo" },
    ],
  },
  {
    heading: "WealthSplit",
    color: "#a78bfa",
    items: [
      { label: "UI built (mock data)", status: "done" },
      { label: "Real calculations from Plaid", status: "todo" },
    ],
  },
  {
    heading: "Auth & Infra",
    color: "#facc15",
    items: [
      { label: "Auth0 login", status: "todo" },
      { label: "Supabase database", status: "todo" },
    ],
  },
];

const STATUS_ICON = { done: "✅", progress: "🔄", todo: "⬜" };

export default function DevNotepad() {
  const [open, setOpen] = useState(true);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 font-mono text-xs">
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#1a1a2e] border border-white/20 rounded-t-xl text-white/70 hover:text-white transition-colors"
      >
        <span>📋 Dev Notepad</span>
        <span>{open ? "▼" : "▲"}</span>
      </button>

      {open && (
        <div className="bg-[#0f0f1a] border border-t-0 border-white/20 rounded-b-xl max-h-[70vh] overflow-y-auto divide-y divide-white/5">
          {NOTES.map(section => (
            <div key={section.heading} className="p-3 space-y-1.5">
              <p className="font-bold mb-2" style={{ color: section.color }}>
                {section.heading}
              </p>
              {section.items.map(item => (
                <div key={item.label} className="flex items-start gap-2 text-white/60">
                  <span>{STATUS_ICON[item.status]}</span>
                  <span className={item.status === "done" ? "line-through text-white/30" : item.status === "progress" ? "text-white/90" : ""}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
