import { api } from './client';

export interface User {
  id: number;
  username: string;
}

export interface LoginRequest {
  username: string;
  pwd: string;
}

export interface RegisterRequest {
  username: string;
  pwd: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
}

// JSON-RPC helper
async function rpcCall<T>(method: string, params?: any): Promise<T> {
  const response = await api.post('/api/rpc', {
    id: Date.now().toString(),
    method,
    params: params || {}
  });

  if (response.data.error) {
    throw new Error(response.data.error.message || 'RPC Error');
  }

  return response.data.result;
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    return rpcCall<AuthResponse>('login', credentials);
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return rpcCall<AuthResponse>('register', data);
  },

  logout: async (): Promise<{ success: boolean }> => {
    return rpcCall<{ success: boolean }>('logout');
  },
};

// Token management
const TOKEN_KEY = 'chia_auth_token';
const USER_KEY = 'chia_user';

export const tokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },

  getUser: (): User | null => {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser: (user: User): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser: (): void => {
    localStorage.removeItem(USER_KEY);
  },

  clear: (): void => {
    tokenManager.removeToken();
    tokenManager.removeUser();
  },
};
