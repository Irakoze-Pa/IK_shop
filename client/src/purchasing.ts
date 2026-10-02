const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/v1`;

export type Supplier = {
  _id: string;
  companyName: string;
  contactPerson?: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  paymentTerms?: string;
  status: 'active' | 'inactive';
};

export type InventoryItem = {
  _id: string;
  productId: string;
  skuSnapshot: string;
  availableQuantity: number;
  reservedQuantity: number;
  unit: string;
  updatedAt: string;
};

export type PurchaseOrderItem = {
  productId: string;
  skuSnapshot: string;
  nameSnapshot: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCostRwf: number;
  lineTotalCostRwf: number;
};

export type PurchaseOrder = {
  _id: string;
  purchaseOrderNumber: string;
  supplierId: Supplier | string;
  items: PurchaseOrderItem[];
  subtotalCostRwf: number;
  status: 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'closed' | 'cancelled';
  expectedDate?: string;
  createdAt: string;
};

const request = async <T extends object>(token: string, path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers } });
  const payload = await response.json() as T | { error?: string };
  if (!response.ok) throw new Error('error' in payload ? payload.error ?? 'Supply operation failed' : 'Supply operation failed');
  return payload as T;
};

export const getSuppliers = (token: string) => request<{ suppliers: Supplier[] }>(token, '/admin/suppliers');
export const createSupplier = (token: string, input: { companyName: string; contactPerson?: string; phone: string; whatsapp?: string; address?: string; paymentTerms?: string }) => request<{ supplier: Supplier }>(token, '/admin/suppliers', { method: 'POST', body: JSON.stringify(input) });
export const updateSupplier = (token: string, supplierId: string, input: Partial<Supplier>) => request<{ supplier: Supplier }>(token, `/admin/suppliers/${supplierId}`, { method: 'PATCH', body: JSON.stringify(input) });
export const getInventory = (token: string) => request<{ inventory: InventoryItem[] }>(token, '/admin/inventory');
export const getPurchaseOrders = (token: string) => request<{ purchaseOrders: PurchaseOrder[] }>(token, '/admin/purchase-orders');
export const createPurchaseOrder = (token: string, input: { supplierId: string; items: Array<{ productId: string; quantityOrdered: number; unitCostRwf: number }>; expectedDate?: string; internalNotes?: string }) => request<{ purchaseOrder: PurchaseOrder }>(token, '/admin/purchase-orders', { method: 'POST', body: JSON.stringify({ ...input, sourceOrderIds: [] }) });
export const updatePurchaseOrderStatus = (token: string, purchaseOrderId: string, status: PurchaseOrder['status']) => request<{ purchaseOrder: PurchaseOrder }>(token, `/admin/purchase-orders/${purchaseOrderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const receivePurchaseOrder = (token: string, purchaseOrder: PurchaseOrder) => request<{ purchaseOrder: PurchaseOrder }>(token, `/admin/purchase-orders/${purchaseOrder._id}/receive`, { method: 'POST', body: JSON.stringify({ items: purchaseOrder.items.filter((item) => item.quantityOrdered > item.quantityReceived).map((item) => ({ productId: item.productId, quantityReceived: item.quantityOrdered - item.quantityReceived })) }) });
