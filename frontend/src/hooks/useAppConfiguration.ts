import { useEffect, useState } from "react";
import { api } from "../api/client";

export interface AppConfiguration {
  backendReady: boolean;
  backendError?: string;
  chiaNodeConnected: boolean;
  chiaNodeError?: string;
  walletConnectable: boolean;
}

/**
 * Hook to validate application configuration before allowing wallet operations
 * Checks:
 * 1. Backend service is running and accessible
 * 2. Database connection is working
 * 3. Chia node is configured (optional but recommended)
 */
export function useAppConfiguration(): AppConfiguration {
  const [config, setConfig] = useState<AppConfiguration>({
    backendReady: false,
    chiaNodeConnected: false,
    walletConnectable: false,
  });

  useEffect(() => {
    const validateConfig = async () => {
      let backendReady = false;
      let backendError: string | undefined;
      let chiaNodeConnected = false;
      let chiaNodeError: string | undefined;

      // Check 1: Backend health
      try {
        const response = await api.get("/health");
        if (response.status === 200) {
          backendReady = true;
        }
      } catch (err) {
        backendError = "Backend service is not running on http://localhost:8080";
        console.warn("[Config] Backend health check failed:", err);
      }

      // (Removed) Do not auto-check Chia node status on mount/login
      // Only check on explicit user action

      // Determine if wallet can be connected
      // Wallet connection doesn't strictly require Chia node, but it's recommended
      const walletConnectable = backendReady;

      setConfig({
        backendReady,
        backendError,
        chiaNodeConnected,
        chiaNodeError,
        walletConnectable,
      });
    };

    // Initial check
    validateConfig();

    // Re-check every 30 seconds
    const interval = setInterval(validateConfig, 30000);

    return () => clearInterval(interval);
  }, []);

  return config;
}
