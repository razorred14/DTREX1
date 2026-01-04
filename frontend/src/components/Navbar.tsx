import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { healthCheck, getChiaNodeStatus, ChiaNodeStatus } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import WalletConnectStatus from "./WalletConnectStatus";

export default function Navbar() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [nodeStatus, setNodeStatus] = useState<ChiaNodeStatus | null>(null);
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await healthCheck();
      setIsHealthy(healthy);
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => { clearInterval(interval); };
  }, []);

  return (
    <nav className="bg-white shadow-md mb-6">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-chia-green">🔄</span>
            <span className="text-xl font-bold text-gray-800">
              DTREX
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <div 
              className="flex items-center space-x-2 relative group"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isHealthy === null
                    ? "bg-gray-400"
                    : isHealthy
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
              <span className="text-sm text-gray-600">
                {isHealthy === null
                  ? "Checking..."
                  : isHealthy
                  ? "Connected"
                  : "Disconnected"}
                <span className="ml-1 text-gray-400">ⓘ</span>
              </span>
              {/* Tooltip */}
              <div className="absolute left-0 mt-8 hidden group-hover:block z-50">
                <div className="max-w-xs p-2 text-xs bg-gray-800 text-white rounded shadow-lg">
                  {isHealthy === null
                    ? "Checking backend server connection..."
                    : isHealthy
                    ? "Backend server is running and responding (http://localhost:8080)"
                    : "Backend server is offline. Start it with 'cd backend && cargo run'"}
                </div>
              </div>
            </div>

            <div 
              className="flex items-center space-x-2 relative group"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  !nodeStatus
                    ? "bg-gray-400"
                    : nodeStatus.connected
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
              <span className="text-sm text-gray-600">
                {!nodeStatus
                  ? "Node"
                  : nodeStatus.connected
                  ? (nodeStatus.network?.toLowerCase() === "mainnet" ? "Mainnet" : nodeStatus.network ?? "Node")
                  : "Node Offline"}
                <span className="ml-1 text-gray-400">ⓘ</span>
              </span>
              {/* Tooltip */}
              <div className="absolute left-0 mt-8 hidden group-hover:block z-50">
                <div className="max-w-xs p-2 text-xs bg-gray-800 text-white rounded shadow-lg">
                  {!nodeStatus
                    ? "Checking Chia node status..."
                    : nodeStatus.connected
                    ? `Chia node connected (${nodeStatus.network ?? "unknown"}), peak height: ${nodeStatus.peak_height ?? "n/a"}`
                    : `Chia node not connected${nodeStatus.error ? ": " + nodeStatus.error : ""}`}
                </div>
              </div>
            </div>

            {isAuthenticated ? (
              <>
                {/* Wallet Connect Status - Only shown when logged in */}
                <WalletConnectStatus />

                <Link
                  to="/trades"
                  className="text-gray-700 hover:text-chia-green transition-colors"
                >
                  Browse Trades
                </Link>

                <Link
                  to="/my-trades"
                  className="text-gray-700 hover:text-chia-green transition-colors"
                >
                  My Trades
                </Link>

                <Link
                  to="/contacts"
                  className="text-gray-700 hover:text-chia-green transition-colors"
                >
                  Contacts
                </Link>

                <Link
                  to="/settings"
                  className="text-gray-700 hover:text-chia-green transition-colors"
                >
                  Settings
                </Link>

                {user?.is_admin && (
                  <Link
                    to="/admin"
                    className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
                  >
                    Admin
                  </Link>
                )}

                <Link to="/create" className="btn-primary">
                  New Trade
                </Link>

                <div className="flex items-center space-x-4 border-l pl-4">
                  <span className="text-sm text-gray-600">
                    {user?.username}
                  </span>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-700 hover:text-red-600 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/trades"
                  className="text-gray-700 hover:text-chia-green transition-colors"
                >
                  Browse Trades
                </Link>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-chia-green transition-colors"
                >
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
