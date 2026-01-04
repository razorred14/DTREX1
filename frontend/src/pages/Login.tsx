import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Step icons as simple SVG components
const ListIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const SwapIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const steps = [
  {
    num: 1,
    title: "List Your Item",
    desc: "Post what you want to trade and set a fair value in USD. Others can offer items or XCH crypto.",
    icon: ListIcon,
    color: "bg-blue-500",
    example: "📦 \"NM Pikachu Card - $50\""
  },
  {
    num: 2,
    title: "Lock the Deal",
    desc: "Both traders pay a small fee (~$1) to commit. This locks the trade on the blockchain.",
    icon: LockIcon,
    color: "bg-purple-500",
    example: "🔒 Secured by Chia blockchain"
  },
  {
    num: 3,
    title: "Ship & Verify",
    desc: "Send your items within the 30-day escrow period. Track shipments and confirm receipt.",
    icon: SwapIcon,
    color: "bg-green-500",
    example: "📮 30-day protected window"
  },
  {
    num: 4,
    title: "Rate & Review",
    desc: "After the trade, rate your partner on timeliness, packaging, and accuracy.",
    icon: StarIcon,
    color: "bg-yellow-500",
    example: "⭐ Build your reputation"
  },
  {
    num: 5,
    title: "Verified Forever",
    desc: "Your trade history is permanently recorded on the Chia blockchain. Fully transparent.",
    icon: CheckIcon,
    color: "bg-emerald-600",
    example: "✅ Immutable proof"
  }
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <div className="text-center pt-8 pb-4">
        <h1 className="text-4xl font-bold text-gray-900">
          🔄 <span className="text-green-600">Decntralized Trading Exchange D-TREX</span>
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Trade anything directly, secured by the Chia Blockchain
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-12 items-start">
        
        {/* Left: How It Works */}
        <div className="space-y-6">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900">How Trading Works</h2>
            <p className="text-gray-600 mt-1">Simple, secure, and transparent — in 5 easy steps</p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div key={step.num} className="relative">
                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div className="absolute left-6 top-16 w-0.5 h-8 bg-gray-200" />
                )}
                
                <div className="flex items-start gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  {/* Icon */}
                  <div className={`${step.color} text-white p-3 rounded-xl flex-shrink-0`}>
                    <step.icon />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">STEP {step.num}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{step.desc}</p>
                    <p className="text-xs text-gray-400 mt-2 font-medium">{step.example}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Value Explanation */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
            <h3 className="font-semibold text-green-800 flex items-center gap-2">
              💡 How Value Works
            </h3>
            <p className="text-sm text-green-700 mt-2">
              <strong>USD is just a reference</strong> — it helps match fair trades. 
              The actual swap is items ↔ items, or items ↔ XCH crypto. 
              No real dollars change hands!
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded-lg p-2 text-center">
                <div className="font-bold text-gray-700">Assets Traded</div>
                <div className="text-gray-500">Pokémon Cards, Collectibles, XCH</div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <div className="font-bold text-gray-700">Value Reference</div>
                <div className="text-gray-500">$USD (for matching only)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="lg:sticky lg:top-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <p className="text-gray-600 mt-1">Sign in to start trading</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-100">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                New to DTREX?{' '}
                <Link to="/register" className="font-semibold text-green-600 hover:text-green-500">
                  Create an account
                </Link>
              </p>
            </div>

            {/* Trust badges */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  🔒 Blockchain Secured
                </span>
                <span className="flex items-center gap-1">
                  🛡️ Escrow Protected
                </span>
                <span className="flex items-center gap-1">
                  ⭐ Reputation System
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-green-600">0%</div>
              <div className="text-xs text-gray-500">Trading Fees*</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-green-600">30</div>
              <div className="text-xs text-gray-500">Day Escrow</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-green-600">~$1</div>
              <div className="text-xs text-gray-500">Commit Fee</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">*Only pay blockchain commit fee</p>
        </div>
      </div>
    </div>
  );
}
