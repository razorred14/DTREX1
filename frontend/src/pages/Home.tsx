import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <div className="bg-green-600 text-white py-4 px-6 text-center">
        <h1 className="text-2xl font-bold">How the Decentralized Trade Exchange Works (D-TREX)</h1>
        <p className="text-green-100 mt-1">Trade any assets directly, secured by the Chia Blockchain.</p>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Step 1 */}
        <div className="mb-8 bg-white rounded-2xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</span>
            <h2 className="text-xl font-bold text-gray-800">Proposal & Value Match</h2>
          </div>
          <div className="ml-11">
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-3">
              <div className="bg-green-50 rounded-lg p-3 text-center flex-1">
                <div className="text-3xl mb-1">👩‍🦰📦</div>
                <div className="font-medium">Alice lists her item</div>
                <div className="text-sm text-gray-500">"NM Pikachu — $50 = 1.25 XCH"</div>
              </div>
              <div className="text-2xl">↔️</div>
              <div className="bg-blue-50 rounded-lg p-3 text-center flex-1">
                <div className="text-3xl mb-1">👨📦</div>
                <div className="font-medium">Bob offers a fair trade</div>
                <div className="text-sm text-gray-500">"Charizard" or "1.25 XCH"</div>
              </div>
            </div>
            <p className="text-gray-600 text-sm italic">Alice lists her item. Bob offers a fair trade.</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="mb-8 bg-white rounded-2xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</span>
            <h2 className="text-xl font-bold text-gray-800">Blockchain Commitment</h2>
          </div>
          <div className="ml-11">
            <div className="flex items-center justify-center gap-6 mb-3">
              <div className="text-center">
                <div className="text-4xl mb-2">👩‍🦰💻</div>
                <div className="text-sm text-gray-500">Alice commits</div>
              </div>
              <div className="text-3xl">🔒✨</div>
              <div className="text-center">
                <div className="text-4xl mb-2">👨💻</div>
                <div className="text-sm text-gray-500">Bob commits</div>
              </div>
            </div>
            <p className="text-gray-600 text-sm italic text-center">Both pay a small fee & lock the trade on the Blockchain.</p>
          </div>
        </div>

        {/* Steps 3 & 4 side by side */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Step 3 */}
          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">3</span>
              <h2 className="text-lg font-bold text-gray-800">Escrow & Swap</h2>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-2">📮</div>
              <div className="inline-block bg-gray-100 rounded-full px-4 py-2 font-bold text-gray-700 mb-2">
                30 Day Escrow
              </div>
              <p className="text-gray-600 text-sm italic">Send, Verify & Swap through Escrow.</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">4</span>
              <h2 className="text-lg font-bold text-gray-800">Review & Rate</h2>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-2">⭐⭐⭐⭐⭐</div>
              <div className="flex justify-center gap-1 mb-2">
                <span className="text-2xl">📋✅</span>
              </div>
              <p className="text-gray-600 text-sm italic">Rate your trading partner fairly.</p>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="mb-8 bg-white rounded-2xl shadow-md p-6 border-l-4 border-emerald-500">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-emerald-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">5</span>
            <h2 className="text-xl font-bold text-gray-800">Verified History</h2>
          </div>
          <div className="ml-11">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center">
                <div className="text-5xl mb-2">📜✅</div>
                <p className="text-sm text-gray-600 italic">Trade is recorded on the Chia Ledger.</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 flex-1">
                <h3 className="font-bold text-amber-800 mb-2">Swap Basis:</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-amber-200">
                      <th className="text-left py-1"></th>
                      <th className="text-left py-1 text-amber-700">XCH (Crypto)</th>
                      <th className="text-left py-1 text-amber-700">Physical Items</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr>
                      <td className="py-1 font-medium">Value Reference:</td>
                      <td className="py-1">$ USD ($50)</td>
                      <td className="py-1">$ USD ($50)</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-medium">Assets Traded:</td>
                      <td className="py-1">XCH</td>
                      <td className="py-1">Pokémon Cards</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Key Points */}
        <div className="bg-green-50 rounded-2xl p-6 mb-8 border border-green-200">
          <h3 className="font-bold text-green-800 text-lg mb-3">💡 Key Points</h3>
          <ul className="space-y-2 text-green-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span><strong>USD is just a reference</strong> — it helps match fair trades, but no dollars change hands</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span><strong>Only ~$1 commitment fee</strong> — paid in XCH to lock the trade on blockchain</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span><strong>30-day escrow protection</strong> — time to ship, receive, and verify items</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span><strong>Permanent reputation</strong> — your trade history lives forever on Chia blockchain</span>
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          {isAuthenticated ? (
            <Link
              to="/trades"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold text-xl px-12 py-4 rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-105"
            >
              Browse Trades →
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold text-xl px-12 py-4 rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-105"
            >
              Continue →
            </Link>
          )}
          <p className="text-gray-500 text-sm mt-4">
            {isAuthenticated ? "Start trading now!" : "Create an account or sign in to start trading"}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 py-6 mt-12 text-center text-gray-500 text-sm">
        <p>🔄 D-TREX — Decentralized Trade Exchange</p>
        <p className="mt-1">Powered by the Chia Blockchain</p>
      </div>
    </div>
  );
}
