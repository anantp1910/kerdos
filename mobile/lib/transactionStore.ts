// In-memory transaction store shared between SmartSwipe and Home tabs

export type SwipeTransaction = {
  id: string;
  merchant: string;
  amount: number;
  cardName: string;
  cardIssuer: string;
  cashback: number;
  category: string;
  date: string;
};

let _transactions: SwipeTransaction[] = [];
const _listeners: Array<() => void> = [];

export function addSwipeTransaction(tx: Omit<SwipeTransaction, 'id' | 'date'>) {
  _transactions = [
    { ...tx, id: String(Date.now()), date: new Date().toISOString() },
    ..._transactions,
  ];
  _listeners.forEach(fn => fn());
}

export function getSwipeTransactions(): SwipeTransaction[] {
  return _transactions;
}

export function subscribeTransactions(fn: () => void): () => void {
  _listeners.push(fn);
  return () => {
    const i = _listeners.indexOf(fn);
    if (i !== -1) _listeners.splice(i, 1);
  };
}
