const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/v1`;

export type NewOrder = {
  id: string;
  orderNumber: string;
  totalRwf: number;
  orderStatus: string;
};

export type CustomerOrder = NewOrder & {
  createdAt: string;
  subtotalRwf: number;
  deliveryFeeRwf: number;
  discountRwf: number;
  currency: 'RWF';
  paymentStatus: string;
  customerNotes?: string | null;
  deliveryAddress: { recipientName: string; phone: string; street: string; city: string; notes?: string };
  items: Array<{ productId: string; nameSnapshot: string; skuSnapshot: string; unitSnapshot: string; quantity: number; unitSellingPriceRwf: number; lineTotalRwf: number }>;
};

type ApiError = { error?: string };

export const createOrder = async (token: string, input: {
  deliveryAddress: { recipientName: string; phone: string; street: string; city: string; notes?: string };
  customerNotes?: string;
}): Promise<{ order: NewOrder }> => {
  const response = await fetch(`${apiBaseUrl}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as { order: NewOrder } | ApiError;
  if (!response.ok) throw new Error((payload as ApiError).error ?? 'Checkout could not be completed');
  return payload as { order: NewOrder };
};

export const getOrders = async (token: string): Promise<{ orders: CustomerOrder[] }> => {
  const response = await fetch(`${apiBaseUrl}/orders`, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json() as { orders: CustomerOrder[] } | ApiError;
  if (!response.ok) throw new Error((payload as ApiError).error ?? 'Orders could not be loaded');
  return payload as { orders: CustomerOrder[] };
};
