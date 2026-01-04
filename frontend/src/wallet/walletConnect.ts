/**
 * WalletConnect integration for Sage Wallet
 * 
 * This module provides WalletConnect v2 connectivity specifically optimized
 * for the Sage wallet (https://github.com/xch-dev/sage).
 * 
 * Sage-specific methods used:
 * - chia_getAddress: Returns the wallet's receive address
 * - chia_signMessageByAddress: Signs a message with a specific address
 * 
 * Note: Other Chia wallets may use different WalletConnect methods.
 * This implementation is tested with Sage wallet.
 */

import SignClient from "@walletconnect/sign-client";
import type { SessionTypes } from "@walletconnect/types";

const PROJECT_ID = "e1220140129080a68c6e42b41b1b327c";

// Sage wallet-specific WalletConnect methods
const SAGE_METHODS = ["chia_getAddress", "chia_signMessageByAddress"];

export interface WalletInfo {
  address: string;
  fingerprint?: string;
  walletType?: "sage" | "unknown";
}

let signClient: SignClient | null = null;
let signClientPromise: Promise<SignClient> | null = null; // Prevent double initialization
let currentSession: SessionTypes.Struct | null = null;
let lastGeneratedUri: string | null = null;

// Storage key for persisting wallet info across page reloads
const WALLET_INFO_STORAGE_KEY = "sage_wallet_info";

/**
 * Initialize the WalletConnect SignClient (singleton pattern)
 * Uses a promise to prevent double initialization in React StrictMode
 */
export async function initSignClient(): Promise<SignClient> {
  // Return existing client if already initialized
  if (signClient) return signClient;
  
  // If initialization is in progress, wait for it
  if (signClientPromise) return signClientPromise;
  
  // Start initialization and store the promise
  signClientPromise = SignClient.init({
    projectId: PROJECT_ID,
    relayUrl: "wss://relay.walletconnect.com",
    metadata: {
      name: "Chia Contract App",
      description: "Secure Multi-sig Management",
      url: window.location.origin,
      icons: [`${window.location.origin}/favicon.ico`],
    },
  });
  
  signClient = await signClientPromise;
  return signClient;
}

/**
 * Check for existing WalletConnect sessions and restore wallet info
 * Sessions are persisted automatically by WalletConnect's SignClient
 * This allows the wallet connection to survive page refreshes
 */
export async function restoreSession(): Promise<WalletInfo | null> {
  try {
    const client = await initSignClient();
    
    // Get all existing sessions from WalletConnect's internal storage
    const sessions = client.session.getAll();
    console.log("[Sage] Found existing sessions:", sessions.length);
    
    if (sessions.length === 0) {
      // No active sessions - clear any stale local storage
      localStorage.removeItem(WALLET_INFO_STORAGE_KEY);
      return null;
    }
    
    // Use the most recent session (last in the array)
    const session = sessions[sessions.length - 1];
    currentSession = session;
    
    // Extract fingerprint from session accounts
    const accounts = session.namespaces.chia?.accounts || [];
    let fingerprint = "";
    if (accounts.length > 0) {
      const parts = accounts[0].split(":");
      fingerprint = parts.length >= 3 ? parts[2] : parts[parts.length - 1];
    }
    
    // Try to get address from the active session
    try {
      const response = await client.request<{ address: string }>({
        topic: session.topic,
        chainId: "chia:mainnet",
        request: { 
          method: "chia_getAddress",
          params: {}
        },
      });
      
      console.log("[Sage] Restored session, chia_getAddress response:", response);
      const address = response?.address || "";
      
      if (address && address.startsWith("xch")) {
        const walletInfo: WalletInfo = { address, fingerprint, walletType: "sage" };
        // Cache the wallet info for faster subsequent loads
        localStorage.setItem(WALLET_INFO_STORAGE_KEY, JSON.stringify(walletInfo));
        return walletInfo;
      }
    } catch (err) {
      console.log("[Sage] Failed to get address from restored session:", err);
    }
    
    // Fallback: try to load cached wallet info from localStorage
    const cachedInfo = localStorage.getItem(WALLET_INFO_STORAGE_KEY);
    if (cachedInfo) {
      try {
        const parsed = JSON.parse(cachedInfo) as WalletInfo;
        // Verify the fingerprint matches the current session
        if (parsed.fingerprint === fingerprint) {
          console.log("[Sage] Using cached wallet info");
          return parsed;
        }
      } catch (e) {
        console.log("[Sage] Failed to parse cached wallet info");
      }
    }
    
    // Session exists but we couldn't get the address
    return { address: "", fingerprint, walletType: "unknown" };
    
  } catch (err) {
    console.error("[Sage] Error restoring session:", err);
    return null;
  }
}

/**
 * Disconnect the current session and clear persisted data
 */
export async function disconnectWallet(): Promise<void> {
  try {
    if (currentSession && signClient) {
      await signClient.disconnect({
        topic: currentSession.topic,
        reason: { code: 4001, message: "User disconnected" },
      });
    }
  } catch (err) {
    console.error("[Sage] Error disconnecting:", err);
  } finally {
    currentSession = null;
    localStorage.removeItem(WALLET_INFO_STORAGE_KEY);
  }
}

/**
 * Get all active sessions (useful for debugging/UI)
 */
export function getActiveSessions(): SessionTypes.Struct[] {
  if (!signClient) return [];
  return signClient.session.getAll();
}

export async function connectWallet(): Promise<WalletInfo> {
  const client = await initSignClient();
  
  // Request Sage wallet-specific methods
  const { uri, approval } = await client.connect({
    optionalNamespaces: {
      chia: {
        methods: SAGE_METHODS,
        chains: ["chia:mainnet"],
        events: ["accountsChanged"],
      },
    },
  });

  if (uri) lastGeneratedUri = uri;

  return new Promise((resolve, reject) => {
    approval().then(async (session) => {
      currentSession = session;
      
      // Get fingerprint from session accounts
      // Format is "chia:mainnet:<fingerprint>"
      const accounts = session.namespaces.chia?.accounts || [];
      let fingerprint = "";
      if (accounts.length > 0) {
        const parts = accounts[0].split(":");
        fingerprint = parts.length >= 3 ? parts[2] : parts[parts.length - 1];
      }

      // Try to get the actual XCH receive address via Sage's chia_getAddress method
      // This is specific to Sage wallet - other wallets may not support this method
      try {
        const response = await client.request<{ address: string }>({
          topic: session.topic,
          chainId: "chia:mainnet",
          request: { 
            method: "chia_getAddress",
            params: {}
          },
        });
        
        console.log("[Sage] chia_getAddress response:", response);
        
        // Sage returns { address: "xch1..." } - this is the receive address
        const address = response?.address || "";
        
        if (address && address.startsWith("xch")) {
          resolve({ address, fingerprint, walletType: "sage" });
          return;
        }
      } catch (err) {
        console.log("[Sage] chia_getAddress not supported or failed:", err);
      }

      // If we only have fingerprint, return that with a note
      // The user will need to enter their address manually
      resolve({ 
        address: "", 
        fingerprint 
      });
    }).catch(reject);
  });
}

export const getLastUri = () => lastGeneratedUri;