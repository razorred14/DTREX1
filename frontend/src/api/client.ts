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

// ============================================
// Trade Types
// ============================================

export interface UserPublicInfo {
  id: number;
  username: string;
  verification_status: string; // 'unverified' | 'email' | 'phone' | 'verified'
  reputation_score: number; // 0.00 - 5.00
  total_trades: number;
}

export interface Trade {
  id: number;
  proposer_id: number;
  acceptor_id?: number;
  status: string; // 'proposal' | 'matched' | 'committed' | 'escrow' | 'completed' | 'disputed' | 'cancelled'
  
  // Proposer info (enriched from backend)
  proposer?: UserPublicInfo;
  acceptor?: UserPublicInfo;
  
  // Proposer's item
  proposer_item_title: string;
  proposer_item_description: string;
  proposer_item_condition?: string;
  proposer_item_value_usd: number;
  proposer_item_category?: string;
  
  // Acceptor's offer
  acceptor_item_title?: string;
  acceptor_item_description?: string;
  acceptor_item_condition?: string;
  acceptor_item_value_usd?: number;
  acceptor_xch_offer?: number;
  
  // Trade details
  xch_amount?: number;
  trade_type?: string;
  
  // Wishlist (what proposer wants)
  wishlist?: WishlistItem[];
  
  // Shipping
  proposer_tracking_number?: string;
  proposer_shipped_at?: string;
  acceptor_tracking_number?: string;
  acceptor_shipped_at?: string;
  
  // Timestamps
  committed_at?: string;
  escrow_start_date?: string;
  escrow_end_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  wishlist_type: string; // 'item' | 'xch' | 'mixed'
  item_description?: string;
  item_min_value_usd?: number;
  xch_amount?: number; // in mojos (1 XCH = 1,000,000,000,000 mojos)
}

export interface CreateTradeRequest {
  item_title: string;
  item_description: string;
  item_condition?: string;
  item_value_usd: number;
  item_category?: string;
  wishlist?: WishlistItem[];
}

export interface AcceptTradeRequest {
  trade_id: number;
  offer_type: string; // 'item' | 'xch' | 'mixed'
  item_title?: string;
  item_description?: string;
  item_condition?: string;
  item_value_usd?: number;
  xch_amount?: number;
}

export interface TradeReview {
  id: number;
  trade_id: number;
  reviewer_id: number;
  reviewee_id: number;
  timeliness_score: number;
  packaging_score: number;
  value_honesty_score: number;
  state_accuracy_score: number;
  overall_score: number;
  comment?: string;
  created_at: string;
}

// Commitment Types
export interface CommitmentDetails {
  trade_id: number;
  exchange_wallet_address: string;
  commitment_fee_usd: number;  // Fee in USD - calculate XCH dynamically
  user_role: 'proposer' | 'acceptor';
  user_commit_status: string;
  other_commit_status: string;
  memo: string;
}

export interface PendingTransaction {
  transaction_id: number;
  to_address: string;
  amount_mojos: number;
  amount_xch: number;
  memo: string;
}

export interface TradeTransaction {
  id: number;
  trade_id: number;
  user_id: number;
  tx_type: string;
  tx_id?: string;
  coin_id?: string;
  from_address?: string;
  to_address?: string;
  amount_mojos: number;
  status: string;
  confirmations?: number;
  error_message?: string;
  created_at: string;
  mempool_at?: string;
  confirmed_at?: string;
}

export interface CreateReviewRequest {
  trade_id: number;
  timeliness: number;
  packaging: number;
  value_honesty: number;
  state_accuracy: number;
  comment?: string;
}

// ============================================
// Trade API
// ============================================

export const tradeApi = {
  // Public methods
  listProposals: async (limit = 50, offset = 0): Promise<Trade[]> => {
    const result = await rpcCall<any>('trade_list_proposals', { limit, offset });
    return result.trades || [];
  },

  getPublic: async (id: number): Promise<Trade> => {
    const result = await rpcCall<any>('trade_get_public', { id });
    return result.trade;
  },

  // Authenticated methods
  create: async (data: CreateTradeRequest): Promise<number> => {
    const result = await rpcCall<any>('trade_create', data);
    return result.trade_id;
  },

  myTrades: async (): Promise<Trade[]> => {
    const result = await rpcCall<any>('trade_my_trades');
    return result.trades || [];
  },

  get: async (id: number): Promise<Trade> => {
    const result = await rpcCall<any>('trade_get', { id });
    return result.trade;
  },

  accept: async (data: AcceptTradeRequest): Promise<void> => {
    await rpcCall('trade_accept', data);
  },

  commit: async (tradeId: number): Promise<void> => {
    await rpcCall('trade_commit', { trade_id: tradeId });
  },

  addTracking: async (tradeId: number, trackingNumber: string, carrier: string): Promise<void> => {
    await rpcCall('trade_add_tracking', { trade_id: tradeId, tracking_number: trackingNumber, carrier });
  },

  complete: async (tradeId: number): Promise<void> => {
    await rpcCall('trade_complete', { trade_id: tradeId });
  },

  cancel: async (tradeId: number): Promise<void> => {
    await rpcCall('trade_cancel', { trade_id: tradeId });
  },

  delete: async (id: number): Promise<void> => {
    await rpcCall('trade_delete', { id });
  },

  // Commitment
  getCommitmentDetails: async (tradeId: number): Promise<CommitmentDetails> => {
    const result = await rpcCall<CommitmentDetails>('commitment_get_details', { trade_id: tradeId });
    return result;
  },

  createPendingCommitment: async (tradeId: number, amountMojos: number, fromAddress?: string): Promise<PendingTransaction> => {
    const result = await rpcCall<PendingTransaction>('commitment_create_pending', { 
      trade_id: tradeId,
      amount_mojos: amountMojos,
      from_address: fromAddress 
    });
    return result;
  },

  submitCommitmentTx: async (transactionId: number, txId: string): Promise<void> => {
    await rpcCall('commitment_submit_tx', { transaction_id: transactionId, tx_id: txId });
  },

  listTransactions: async (tradeId: number): Promise<TradeTransaction[]> => {
    const result = await rpcCall<any>('commitment_list_transactions', { trade_id: tradeId });
    return result.transactions || [];
  },

  // Reviews
  submitReview: async (data: CreateReviewRequest): Promise<number> => {
    const result = await rpcCall<any>('trade_review', data);
    return result.review_id;
  },

  getUserReviews: async (userId: number): Promise<TradeReview[]> => {
    const result = await rpcCall<any>('user_reviews', { user_id: userId });
    return result.reviews || [];
  },
};

// ============================================
// Legacy Contract Types (backward compatibility)
// ============================================

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
