const BASE = 'https://rewards-credit-card-api.p.rapidapi.com';
const HEADERS = {
  'x-rapidapi-key': process.env.REWARDSCC_API_KEY!,
  'x-rapidapi-host': 'rewards-credit-card-api.p.rapidapi.com',
  'Content-Type': 'application/json',
};

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`rewardscc ${path}: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

// Detail for a single card by its slug
export const getCardDetail = (cardKey: string) =>
  get(`/creditcard-detail-bycard/${cardKey}`);

// Search cards by name — returns array of matches
export const searchCardsByName = (name: string) =>
  get(`/creditcard-detail-namesearch/${encodeURIComponent(name)}`);

// Card image URL
export const getCardImage = (cardKey: string) =>
  get(`/creditcard-card-image/${cardKey}`);

// All spend bonus categories
export const getSpendCategories = () =>
  get('/creditcard-spendbonuscategory-categorylist');

// Cards that earn bonus in a specific category (by categoryId)
export const getCardsByCategory = (categoryId: number) =>
  get(`/creditcard-spendbonuscategory-categorycard/${categoryId}`);

// Best cards for a specific merchant + type (Google Maps)
export const getTopCardsForMerchant = (merchantName: string, merchantType: string) =>
  get(`/creditcard-spend-googlemaps-top-cards/${encodeURIComponent(merchantName)}/${encodeURIComponent(merchantType)}`);

// Score for a specific card at a specific merchant
export const getCardSpendAtMerchant = (cardKey: string, merchantName: string, merchantType: string) =>
  get(`/creditcard-spend-googlemaps/${cardKey}/${encodeURIComponent(merchantName)}/${encodeURIComponent(merchantType)}`);

// Plaid spending breakdown by card
export const getPlaidSpendByCard = (cardKey: string) =>
  get(`/creditcard-plaid-bycard/${cardKey}`);

// All point transfer programs
export const getTransferPrograms = () =>
  get('/creditcard-pointtransfer-transferprogramlist/');

// Cards that support a specific transfer program
export const getCardsByTransferProgram = (programId: number) =>
  get(`/creditcard-pointtransfer-transferprogramcard/${programId}`);
