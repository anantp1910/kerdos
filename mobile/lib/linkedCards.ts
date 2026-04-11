import * as SecureStore from 'expo-secure-store';

export type LinkedCardMapping = {
  plaidAccountId: string;
  plaidName: string;
  plaidMask: string;
  cardId: string;
};

const KEY = 'plaid_linked_cards';

export async function getLinkedCards(): Promise<LinkedCardMapping[] | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as LinkedCardMapping[]) : null;
  } catch {
    return null;
  }
}

export async function setLinkedCards(cards: LinkedCardMapping[]): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(cards));
}

export async function clearLinkedCards(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

export async function getLinkedCardIds(): Promise<string[] | null> {
  const cards = await getLinkedCards();
  return cards ? cards.map(c => c.cardId) : null;
}
