const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/v1`;

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  brandId?: string;
  description?: string | null;
  images: string[];
  unit: string;
  sellingPriceRwf: number;
  minimumOrder: number;
  status: string;
};

type ApiError = { error?: string };

const request = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`);
  const payload = (await response.json()) as T | ApiError;

  if (!response.ok) {
    const errorPayload = payload as ApiError;
    throw new Error(errorPayload.error ?? 'The catalog could not be loaded');
  }

  return payload as T;
};

export const getCategories = (): Promise<{ categories: CatalogCategory[] }> => request('/categories');
export const getProducts = (query = ''): Promise<{ products: CatalogProduct[] }> => request(`/products?limit=50${query ? `&${query}` : ''}`);

export const createAdminCategory = async (token: string, input: { name: string; description: string; image?: string }): Promise<{ category: CatalogCategory }> => {
  const response = await fetch(`${apiBaseUrl}/admin/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const payload = await response.json() as { category?: CatalogCategory; error?: string };
  if (!response.ok || !payload.category) throw new Error(payload.error ?? 'Category could not be created');
  return { category: payload.category };
};