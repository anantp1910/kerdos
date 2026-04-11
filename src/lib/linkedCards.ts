const KEY = 'plaid_linked_cards';

export type LinkedCardMapping = {
  plaidAccountId: string;
  plaidName:      string;
  plaidMask:      string;
  cardId:         string; // matches internal IDs: amex-gold | chase-sapphire | citi-double | discover-it | capital-venture
};

export function getLinkedCards(): LinkedCardMapping[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LinkedCardMapping[]) : null;
  } catch {
    return null;
  }
}

export function setLinkedCards(cards: LinkedCardMapping[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(cards));
}

export function clearLinkedCards(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

export function getLinkedCardIds(): string[] | null {
  const cards = getLinkedCards();
  return cards ? cards.map(c => c.cardId) : null;
}
