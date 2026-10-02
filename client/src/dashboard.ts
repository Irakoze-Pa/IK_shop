const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/v1`;

export type DashboardSummary = {
  orders: number;
  pendingOrders: number;
  activeProducts: number;
  openPurchaseOrders: number;
  pendingDeliveries: number;
  revenueRwf: number;
  lowStock: Array<{ skuSnapshot: string; availableQuantity: number; reservedQuantity: number; unit: string }>;
  recentOrders: Array<{ orderNumber: string; totalRwf: number; orderStatus: string; createdAt: string }>;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  description?: string | null;
  images: string[];
  unit: string;
  sellingPriceRwf: number;
  costPriceRwf: number;
  minimumOrder: number;
  status: string;
};

const adminHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export const getAdminProducts = async (token: string): Promise<AdminProduct[]> => {
  const response = await fetch(`${apiBaseUrl}/admin/products`, { headers: adminHeaders(token) });
  const payload = await response.json() as { products?: AdminProduct[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Products could not be loaded');
  return payload.products ?? [];
};

export const getDashboardSummary = async (token: string): Promise<DashboardSummary> => {
  const response = await fetch(`${apiBaseUrl}/admin/reports/summary`, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json() as DashboardSummary | { error?: string };
  if (!response.ok) throw new Error('error' in payload ? payload.error ?? 'Dashboard could not be loaded' : 'Dashboard could not be loaded');
  return payload as DashboardSummary;
};

export const createAdminProduct = async (token: string, input: {
  name: string;
  sku: string;
  categoryId: string;
  description?: string;
  unit: string;
  costPriceRwf: number;
  sellingPriceRwf: number;
  minimumOrder: number;
  images: string[];
}) => {
  const response = await fetch(`${apiBaseUrl}/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...input, slug: input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }),
  });
  const payload = await response.json() as { product?: unknown; error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Product could not be created');
  return payload;
};

export const updateAdminProduct = async (token: string, productId: string, input: Partial<Parameters<typeof createAdminProduct>[1]> & { slug?: string }): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/admin/products/${productId}`, {
    method: 'PATCH',
    headers: { ...adminHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Product could not be updated');
};

export const archiveAdminProduct = async (token: string, productId: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/admin/products/${productId}/archive`, { method: 'POST', headers: adminHeaders(token) });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Product could not be archived');
};

export const uploadProductImage = async (token: string, file: File): Promise<string> => {
  const signatureResponse = await fetch(`${apiBaseUrl}/admin/uploads/signature`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  const signature = await signatureResponse.json() as { cloudName?: string; apiKey?: string; folder?: string; timestamp?: number; signature?: string; error?: string };
  if (!signatureResponse.ok || !signature.cloudName || !signature.apiKey || !signature.folder || !signature.timestamp || !signature.signature) throw new Error(signature.error ?? 'Cloudinary upload is not configured');
  const data = new FormData();
  data.append('file', file);
  data.append('api_key', signature.apiKey);
  data.append('folder', signature.folder);
  data.append('timestamp', String(signature.timestamp));
  data.append('signature', signature.signature);
  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`, { method: 'POST', body: data });
  const uploaded = await uploadResponse.json() as { secure_url?: string; error?: { message?: string } };
  const uploadError = uploaded.error?.message ?? '';
  if (!uploadResponse.ok || !uploaded.secure_url) {
    if (/missing permissions|actions=.*create|forbidden/i.test(uploadError)) throw new Error('Cloudinary rejected this API key: enable upload/create permission or use an unrestricted API key, then restart the server.');
    throw new Error(uploadError || 'Product image upload failed');
  }
  return uploaded.secure_url;
};
