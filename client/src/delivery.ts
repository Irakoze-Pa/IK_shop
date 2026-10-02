const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/v1`;

export type CustomerDelivery = {
  _id: string;
  orderId: string;
  feeRwf: number;
  driverOrPartner?: string;
  status: 'pending' | 'assigned' | 'dispatched' | 'delivered' | 'failed' | 'returned';
  assignedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  confirmation?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminDelivery = CustomerDelivery & {
  address: { recipientName?: string; phone?: string; street?: string; city?: string };
  notes?: string;
};

export const getOrderDelivery = async (token: string, orderId: string): Promise<CustomerDelivery> => {
  const response = await fetch(`${apiBaseUrl}/deliveries/order/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json() as { delivery?: CustomerDelivery; error?: string };
  if (!response.ok || !payload.delivery) throw new Error(payload.error ?? 'Delivery tracking could not be loaded');
  return payload.delivery;
};

export const getAdminDeliveries = async (token: string): Promise<AdminDelivery[]> => {
  const response = await fetch(`${apiBaseUrl}/deliveries/admin`, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json() as { deliveries?: AdminDelivery[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Deliveries could not be loaded');
  return payload.deliveries ?? [];
};

export const updateAdminDelivery = async (token: string, deliveryId: string, input: { status?: CustomerDelivery['status']; driverOrPartner?: string; confirmation?: string; notes?: string }): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/deliveries/admin/${deliveryId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(input) });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Delivery could not be updated');
};
