import { useState } from "react";
import WalletConnector from "../components/WalletConnector";
import { type WalletInfo } from "../wallet/walletConnect";

export default function Wallet() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [xchAddress, setXchAddress] = useState("");
  const [masterPublicKey, setMasterPublicKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const handleConnectionChange = (connected: boolean, info?: WalletInfo) => {
    setIsConnected(connected);
    if (connected && info) {
      setWalletInfo(info);
      // Pre-fill XCH address from wallet (if it's valid)
      if (info.address && info.address.startsWith("xch")) {
        setXchAddress(info.address);
      } else if (info.address) {
        // Wallet returned a simplified format, user needs to enter proper address
        console.log("Wallet returned simplified address format:", info.address);
        setXchAddress(""); // Clear it so user must enter the proper xch address
      }
      // Pre-fill public key if available
      if (info.publicKey) {
        setMasterPublicKey(info.publicKey);
      }
    } else {
      setWalletInfo(null);
      setXchAddress("");
      setMasterPublicKey("");
      setIsSaved(false);
    }
  };

  const handleSaveWalletInfo = () => {
    // Validate inputs
    if (!xchAddress.trim()) {
      alert("Please enter your XCH wallet address");
      return;
    }

    if (!isValidXchAddress(xchAddress.trim())) {
      alert("Invalid XCH address. Must start with 'xch1' and be at least 60 characters");
      return;
    }

    if (!masterPublicKey.trim() || masterPublicKey.length !== 96) {
      alert("Please enter a valid 96-character master public key");
      return;
    }

    // Save to localStorage for now (in production, this would go to backend)
    const walletData = {
      xchAddress: xchAddress.trim(),
      masterPublicKey: masterPublicKey.trim(),
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem("chia_wallet_info", JSON.stringify(walletData));
    setIsSaved(true);

    // Show success message
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  const isValidPubKey = (key: string) => {
    return key.length === 96 && /^[0-9a-fA-F]+$/.test(key);
  };

  const isValidXchAddress = (addr: string) => {
    // XCH addresses start with 'xch1' and are typically 62-64 characters
    return addr.startsWith("xch1") && addr.length >= 60;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Wallet Connection</h1>
          <p className="text-gray-600">
            Connect your Chia wallet to sign transactions and manage contracts
          </p>
        </div>

        {/* Wallet Connector Component */}
        <div className="mb-6">
          <WalletConnector onConnectionChange={handleConnectionChange} />
        </div>

        {/* Wallet Information Form */}
        {isConnected && (
          <div className="card space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Wallet Information</h2>
              <p className="text-sm text-gray-600 mb-4">
                Save your wallet details for quick access when creating contracts and signing transactions.
              </p>
            </div>

            {/* XCH Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                XCH Wallet Address * {!xchAddress && <span className="text-red-600">(Required)</span>}
              </label>
              {!xchAddress && (
                <div className="bg-orange-50 border border-orange-300 p-3 rounded mb-3">
                  <p className="text-sm font-semibold text-orange-900 mb-2">📍 Where to find your XCH address:</p>
                  <ol className="text-sm text-orange-800 space-y-1 list-decimal list-inside">
                    <li><strong>Chia Wallet Desktop:</strong> Go to Settings → Wallet → Copy your address</li>
                    <li><strong>Chia Signer (Mobile):</strong> Open the wallet, tap your address to copy</li>
                    <li><strong>Other Wallets:</strong> Look for "Wallet Address" or "Public Address" in settings</li>
                  </ol>
                </div>
              )}
              <input
                type="text"
                className="input-field"
                value={xchAddress}
                onChange={(e) => setXchAddress(e.target.value)}
                placeholder="xch1... (e.g., xch1qzuf8p2nfxqvt2r8px5pd5hxu5ujw5clmxl0yqz9w4mj3fxucg52p2kzrx)"
              />
              {xchAddress && !isValidXchAddress(xchAddress) && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Invalid address format. Must start with 'xch1' and be at least 60 characters.
                </p>
              )}
              {xchAddress && isValidXchAddress(xchAddress) && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Valid XCH address format
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                💡 This is your wallet address for receiving Chia tokens
              </p>
            </div>

            {/* Master Public Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Master Public Key (96 hex characters) *
              </label>
              <textarea
                className={`input-field font-mono text-sm ${
                  masterPublicKey && !isValidPubKey(masterPublicKey)
                    ? "border-red-400 focus:border-red-500"
                    : ""
                }`}
                rows={3}
                value={masterPublicKey}
                onChange={(e) => setMasterPublicKey(e.target.value)}
                placeholder="Paste your 96-character hexadecimal master public key..."
                maxLength={96}
              />
              {masterPublicKey && !isValidPubKey(masterPublicKey) && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Invalid public key. Must be exactly 96 hexadecimal characters.
                </p>
              )}
              {masterPublicKey && isValidPubKey(masterPublicKey) && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Valid public key format
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                💡 Used for signing transactions and verifying your identity
              </p>
            </div>

            {/* Character Count */}
            <div className="text-xs text-gray-500">
              Public key length: {masterPublicKey.length} / 96 characters
            </div>

            {/* Success Message */}
            {isSaved && (
              <div className="bg-green-50 border border-green-400 text-green-700 p-4 rounded">
                <p className="font-semibold">✓ Wallet information saved successfully!</p>
                <p className="text-sm mt-1">
                  Your wallet details have been stored and will be used for contract operations.
                </p>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSaveWalletInfo}
              className="btn-primary w-full"
              disabled={!isValidXchAddress(xchAddress) || !isValidPubKey(masterPublicKey)}
            >
              Save Wallet Information
            </button>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                🔐 Privacy & Security
              </p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Your private keys never leave your wallet device</li>
                <li>• Only public information (address and public key) is stored</li>
                <li>• All transactions require approval from your wallet app</li>
                <li>• This data is stored locally in your browser</li>
              </ul>
            </div>
          </div>
        )}

        {/* Instructions when not connected */}
        {!isConnected && (
          <div className="card bg-gray-50">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👛</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-gray-600 mb-6">
                Click the "Connect Wallet" button above to get started
              </p>
              <div className="text-left max-w-md mx-auto bg-white p-4 rounded border border-gray-200">
                <p className="font-semibold text-gray-800 mb-3">What you'll need:</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Chia Signer app or CHIP-002 compatible wallet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Your XCH wallet address (xch1...)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Your master public key (96 hex characters)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
