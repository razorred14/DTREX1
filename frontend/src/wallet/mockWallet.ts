/**
 * Mock Wallet for development/testing
 * Simulates Chia wallet connection without requiring actual WalletConnect setup
 */

export interface WalletInfo {
  address: string;
  publicKey: string;
  chainId?: string;
}

let mockConnected = false;
let mockWalletInfo: WalletInfo | null = null;

// Generate a mock Chia address and BLS public key
const MOCK_ADDRESS = "xch1qyv5wap26l9jx2yd4gphnx65nmy7mr3nj5nms65ujezfjxem43zsgm6dl2";
const MOCK_PUBLIC_KEY = "b2d7b27d71a19d2f1d2c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d";

/**
 * Connect to mock wallet (for development)
 */
export async function connectMockWallet(): Promise<WalletInfo> {
  return new Promise((resolve) => {
    // Simulate connection delay
    setTimeout(() => {
      mockWalletInfo = {
        address: MOCK_ADDRESS,
        publicKey: MOCK_PUBLIC_KEY,
        chainId: "mainnet",
      };
      mockConnected = true;
      console.log("✅ Mock wallet connected");
      resolve(mockWalletInfo);
    }, 1000);
  });
}

/**
 * Disconnect from mock wallet
 */
export async function disconnectMockWallet(): Promise<void> {
  mockConnected = false;
  mockWalletInfo = null;
  console.log("🔌 Mock wallet disconnected");
}

/**
 * Get mock wallet info
 */
export function getMockWalletInfo(): WalletInfo | null {
  return mockWalletInfo;
}

/**
 * Check if mock wallet is connected
 */
export function isMockConnected(): boolean {
  return mockConnected;
}

/**
 * Sign a message with mock wallet
 */
export async function signMessageWithMock(message: string): Promise<string> {
  if (!mockConnected) {
    throw new Error("Mock wallet not connected");
  }

  // Simulate signing delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Return a mock signature (BLS signature format: 192 hex chars = 96 bytes)
  const mockSignature = "a" + "b".repeat(191);
  console.log("✍️ Message signed (mock):", mockSignature.substring(0, 20) + "...");
  return mockSignature;
}

/**
 * Sign a spend bundle with mock wallet
 */
export async function signSpendBundleWithMock(spendBundle: {
  coin_spends: unknown[];
  aggregated_signature: string;
}): Promise<{ signature: string; spend_bundle: unknown }> {
  if (!mockConnected) {
    throw new Error("Mock wallet not connected");
  }

  // Simulate signing delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const mockSignature = "c" + "d".repeat(191);
  console.log("✍️ Spend bundle signed (mock):", mockSignature.substring(0, 20) + "...");

  return {
    signature: mockSignature,
    spend_bundle: spendBundle,
  };
}
