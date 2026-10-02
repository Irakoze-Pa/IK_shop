const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/v1`;

export type ManagedCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string | null;
  orderCount: number;
  totalOrderValueRwf: number;
};

export const getManagedCustomers = async (token: string): Promise<ManagedCustomer[]> => {
  const response = await fetch(`${apiBaseUrl}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json() as { users?: ManagedCustomer[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Customers could not be loaded');
  return payload.users ?? [];
};

export const updateManagedCustomerStatus = async (token: string, userId: string, status: ManagedCustomer['status']): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/admin/users/${userId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Customer account could not be updated');
};
