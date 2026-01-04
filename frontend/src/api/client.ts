import axios from "axios";

export const api = axios.create({
  baseURL: "/",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('chia_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect to login
      localStorage.removeItem('chia_auth_token');
      localStorage.removeItem('chia_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// JSON-RPC helper
export async function rpcCall<T>(method: string, params?: any): Promise<T> {
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

// Contract API calls using JSON-RPC
export interface CreateContractRequest {
  title: string;
  content: string;
  description?: string;
  party1_public_key: string;
  party2_public_key: string;
  amount: number;
}

export interface Contract {
  id: number;
  user_id: number;
  title: string;
  content: string;
  description?: string;
  party1_public_key: string;
  party2_public_key: string;
  amount: number;
  status: string;
  puzzle_hash?: string;
  coin_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateContractRequest {
  title?: string;
  content?: string;
  description?: string;
}

export const contractApi = {
  create: async (data: CreateContractRequest): Promise<Contract> => {
    const result = await rpcCall<any>('contract_create', data);
    return result.contract || result;
  },

  list: async (): Promise<Contract[]> => {
    const result = await rpcCall<any>('contract_list');
    return result.contracts || result || [];
  },

  get: async (id: number): Promise<Contract> => {
    const result = await rpcCall<any>('contract_get', { id });
    return result.contract || result;
  },

  update: async (id: number, data: UpdateContractRequest): Promise<Contract> => {
    const result = await rpcCall<any>('contract_update', { id, ...data });
    return result.contract || result;
  },

  delete: async (id: number): Promise<{ success: boolean }> => {
    const result = await rpcCall<any>('contract_delete', { id });
    return { success: result.success !== false };
  },
};

// Contacts API calls
export interface Contact {
  id: string;
  name: string;
  public_key: string;
  xch_address?: string;
  email?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactRequest {
  name: string;
  public_key: string;
  xch_address?: string;
  email?: string;
  note?: string;
}

export interface UpdateContactRequest {
  name?: string;
  public_key?: string;
  xch_address?: string;
  email?: string;
  note?: string;
}

export const contactApi = {
  list: async (): Promise<Contact[]> => {
    // TODO: Implement contact RPC methods
    return [];
  },

  create: async (data: CreateContactRequest): Promise<Contact> => {
    // TODO: Implement contact RPC methods
    throw new Error('Contact creation not yet implemented');
  },

  update: async (id: string, data: UpdateContactRequest): Promise<Contact> => {
    // TODO: Implement contact RPC methods
    throw new Error('Contact update not yet implemented');
  },

  remove: async (id: string): Promise<void> => {
    // TODO: Implement contact RPC methods
    throw new Error('Contact removal not yet implemented');
  },
};

// Files API calls
export interface FileMetadata {
  file_id: string;
  filename: string;
  content_type: string;
  size: number;
  hash: string;
  uploaded_at: string;
}

export interface UploadFileResponse {
  file_id: string;
  filename: string;
  content_type: string;
  size: number;
  hash: string;
}

export const fileApi = {
  upload: async (file: File): Promise<UploadFileResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/files", formData, {
      transformRequest: [(data) => data], // Pass FormData as-is
    });
    return response.data;
  },

  list: async (): Promise<FileMetadata[]> => {
    try {
      const response = await api.get("/files");
      return response.data || [];
    } catch {
      return [];
    }
  },

  getUrl: (fileId: number): string => {
    return `/files/${fileId}`;
  },

  delete: async (fileId: number): Promise<void> => {
    await api.delete(`/files/${fileId}`);
  },
};

export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await api.get("/health");
    return response.status === 200;
  } catch {
    return false;
  }
};

export interface ChiaNodeStatus {
  connected: boolean;
  network?: string;
  peak_height?: number;
  sync_mode?: boolean;
  error?: string;
  rpc_url?: string;
}

export const getChiaNodeStatus = async (
  mode?: 'wallet' | 'node',
  url?: string,
  test?: boolean
): Promise<ChiaNodeStatus> => {
  try {
    let query = [];
    if (mode) query.push(`type=${encodeURIComponent(mode)}`);
    if (url) query.push(`url=${encodeURIComponent(url)}`);
    if (test) query.push('test=1');
    const q = query.length ? `?${query.join('&')}` : '';
    const response = await api.get(`/chia/node/status${q}`);
    return response.data as ChiaNodeStatus;
  } catch {
    return { connected: false, error: "Failed to fetch Chia node status" };
  }
};

export const setChiaRpcConfig = async (rpc_url: string, mode?: string) => {
  try {
    const response = await api.post("/chia/config", { rpc_url, mode });
    return response.data;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to set Chia RPC config");
  }
};

// SSL Certificate API
export interface SslStatus {
  has_cert: boolean;
  has_key: boolean;
  cert_path?: string;
  key_path?: string;
  has_ca?: boolean;
  ca_path?: string;
}

export const getSslStatus = async (mode?: 'wallet' | 'full_node'): Promise<SslStatus> => {
  // Optionally pass mode as query param for backend to distinguish
  const response = await api.get(`/ssl/status${mode ? `?type=${mode}` : ''}`);
  return response.data as SslStatus;
};

export const uploadSslCertificates = async (formData: FormData): Promise<{ success: boolean; message: string }> => {
  const response = await api.post("/ssl/upload", formData, {
    transformRequest: [(data) => data], // Pass FormData as-is
  });
  return response.data;
};

export const deleteSslCertificates = async (mode?: 'wallet' | 'full_node'): Promise<{ success: boolean; message: string }> => {
  // Optionally pass mode as param for backend to distinguish
  const response = await api.post(`/ssl/delete${mode ? `?type=${mode}` : ''}`);
  return response.data;
};

export const setSslPaths = async (cert_path: string, key_path: string, mode: 'wallet' | 'full_node'): Promise<{ success: boolean; message: string }> => {
  const response = await api.post("/ssl/set", { mode, cert_path, key_path });
  return response.data;
};

// setSslIdentityPath removed (PKCS#12 no longer supported)

export const setSslCaPath = async (ca_path: string, mode: 'wallet' | 'full_node'): Promise<{ success: boolean; message: string }> => {
  const response = await api.post("/ssl/set", { mode, cert_path: "", key_path: "", ca_path });
  return response.data;
};

// Clear all Chia RPC and SSL state (node and wallet)
export const clearChiaConfig = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/chia/clear');
  return response.data;
};
