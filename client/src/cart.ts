const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/v1`;

export type CartItem = {
  productId: string;
  quantity: number;
  priceSnapshotRwf: number;
  nameSnapshot: string;
  skuSnapshot: string;
  lineTotalRwf: number;
};

type CartResponse = { cart: { items: CartItem[] } };
type ApiError = { error?: string };

const request = async <T>(token: string, path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  });
  const payload = (await response.json()) as T | ApiError;

  if (!response.ok) {
    const errorPayload = payload as ApiError;
    throw new Error(errorPayload.error ?? 'The cart request could not be completed');
  }

  return payload as T;
};

export const getCart = (token: string): Promise<CartResponse> => request(token, '/cart');

export const updateCartItem = (token: string, productId: string, quantity: number): Promise<CartResponse> =>
  request(token, `/cart/items/${productId}`, { method: 'PUT', body: JSON.stringify({ quantity }) });

export const removeCartItem = (token: string, productId: string): Promise<CartResponse> =>
  request(token, `/cart/items/${productId}`, { method: 'DELETE' });