"use client";

const CARD_GRADIENTS: Record<string, [string, string]> = {
  amex:    ['#1a1a2e', '#0f3460'],
  chase:   ['#1a0533', '#2d0d63'],
  citi:    ['#0a1628', '#1a3a5c'],
  discover:['#1a0a00', '#5c2a00'],
  capital: ['#001a0a', '#005c26'],
  other:   ['#1a1a1a', '#2a2a2a'],
};

export interface CreditCardData {
  id: string;
  issuer: string;
  name: string;
  last4: string;
  network: string;
  color: string;
}

export default function CreditCard({ card, width = 220 }: { card: CreditCardData; width?: number }) {
  const [from, to] = CARD_GRADIENTS[card.color] ?? CARD_GRADIENTS.other;
  const height = Math.round(width * 0.63);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 16,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shine overlay */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 120, height: 120, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
        pointerEvents: 'none',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
          {card.issuer.toUpperCase()}
        </span>
        {/* Chip */}
        <div style={{
          width: 28, height: 20, borderRadius: 4,
          background: 'linear-gradient(135deg, #d4a843, #b8902d)',
          border: '1px solid rgba(255,255,255,0.2)',
        }} />
      </div>

      {/* Bottom row */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 4, letterSpacing: 2 }}>
          •••• •••• •••• {card.last4}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {card.name}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
            {card.network.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
