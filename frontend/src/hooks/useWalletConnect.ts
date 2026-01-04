/**
 * React hook for WalletConnect integration with Sage Wallet
 * Provides easy access to wallet connection state and transaction signing
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  initSignClient, 
  restoreSession, 
  connectWallet, 
  disconnectWallet as wcDisconnect,
} from '../wallet/walletConnect';
import SignClient from "@walletconnect/sign-client";
import type { SessionTypes } from "@walletconnect/types";

interface SendTransactionParams {
  to: string;
  amount: number; // in mojos
  memo?: string;
}

interface UseWalletConnectReturn {
  isConnected: boolean;
  isConnecting: boolean;
  walletAddress: string | null;
  fingerprint: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (params: SendTransactionParams) => Promise<string | null>;
  signMessage: (message: string) => Promise<string | null>;
  error: string | null;
}

let signClient: SignClient | null = null;
let currentSession: SessionTypes.Struct | null = null;

export function useWalletConnect(): UseWalletConnectReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize and check for existing session on mount
  useEffect(() => {
    const init = async () => {
      try {
        signClient = await initSignClient();
        
        // Check for existing session
        const walletInfo = await restoreSession();
        if (walletInfo) {
          setIsConnected(true);
          setWalletAddress(walletInfo.address || null);
          setFingerprint(walletInfo.fingerprint || null);
          
          // Get current session
          const sessions = signClient.session.getAll();
          if (sessions.length > 0) {
            currentSession = sessions[sessions.length - 1];
          }
        }
      } catch (err: any) {
        console.error('[useWalletConnect] Init error:', err);
      }
    };
    
    init();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const walletInfo = await connectWallet();
      setIsConnected(true);
      setWalletAddress(walletInfo.address || null);
      setFingerprint(walletInfo.fingerprint || null);
      
      // Update current session
      if (signClient) {
        const sessions = signClient.session.getAll();
        if (sessions.length > 0) {
          currentSession = sessions[sessions.length - 1];
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('[useWalletConnect] Connect error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await wcDisconnect();
      setIsConnected(false);
      setWalletAddress(null);
      setFingerprint(null);
      currentSession = null;
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    }
  }, []);

  const sendTransaction = useCallback(async (params: SendTransactionParams): Promise<string | null> => {
    if (!signClient || !currentSession) {
      setError('Wallet not connected');
      return null;
    }
    
    try {
      setError(null);
      
      // Use chia_sendTransaction method (Sage wallet specific)
      // This creates and signs a transaction to send XCH
      const response = await signClient.request<{ transaction_id?: string; tx_id?: string }>({
        topic: currentSession.topic,
        chainId: "chia:mainnet",
        request: {
          method: "chia_sendTransaction",
          params: {
            to_address: params.to,
            amount: params.amount, // mojos
            memo: params.memo || "",
            fee: 0, // Let wallet determine fee
          },
        },
      });
      
      console.log('[useWalletConnect] sendTransaction response:', response);
      return response?.transaction_id || response?.tx_id || null;
      
    } catch (err: any) {
      // Check if user rejected
      if (err.message?.includes('rejected') || err.code === 4001) {
        setError('Transaction rejected by user');
        return null;
      }
      
      // Check if method not supported - try alternative approach
      if (err.message?.includes('not supported') || err.code === -32601) {
        console.log('[useWalletConnect] chia_sendTransaction not supported, trying chia_signCoinSpends');
        // TODO: Implement coin spend building for wallets that don't support sendTransaction
        setError('Your wallet does not support direct transactions. Please use a wallet that supports chia_sendTransaction.');
        return null;
      }
      
      setError(err.message || 'Transaction failed');
      console.error('[useWalletConnect] sendTransaction error:', err);
      return null;
    }
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!signClient || !currentSession) {
      setError('Wallet not connected');
      return null;
    }
    
    try {
      setError(null);
      
      const response = await signClient.request<{ signature: string }>({
        topic: currentSession.topic,
        chainId: "chia:mainnet",
        request: {
          method: "chia_signMessageByAddress",
          params: {
            message,
            address: walletAddress,
          },
        },
      });
      
      return response?.signature || null;
      
    } catch (err: any) {
      if (err.message?.includes('rejected') || err.code === 4001) {
        setError('Signing rejected by user');
        return null;
      }
      
      setError(err.message || 'Signing failed');
      console.error('[useWalletConnect] signMessage error:', err);
      return null;
    }
  }, [walletAddress]);

  return {
    isConnected,
    isConnecting,
    walletAddress,
    fingerprint,
    connect,
    disconnect,
    sendTransaction,
    signMessage,
    error,
  };
}

// Re-export the original functions for non-React usage
export { connectWallet, disconnectWallet, restoreSession, getLastUri } from '../wallet/walletConnect';
export type { WalletInfo } from '../wallet/walletConnect';
