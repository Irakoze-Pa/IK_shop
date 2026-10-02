const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/v1`;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  status: 'active' | 'suspended';
};

type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

type MeResponse = { user: AuthUser };
type ApiError = { error?: string };

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const payload = (await response.json()) as T;

  if (!response.ok) {
    const errorPayload = payload as ApiError;
    throw new Error(errorPayload.error ?? 'The request could not be completed');
  }

  return payload as T;
};

export const register = (name: string, phone: string, email: string, password: string, confirmPassword: string): Promise<AuthResponse> =>
  request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, phone, email, password, confirmPassword }),
  });

export const login = (email: string, password: string): Promise<AuthResponse> =>
  request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const getCurrentUser = (accessToken: string): Promise<MeResponse> =>
  request<MeResponse>('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

export const updateCurrentUser = (accessToken: string, input: { name: string; email: string; phone: string }): Promise<MeResponse> =>
  request<MeResponse>('/auth/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
