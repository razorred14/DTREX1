import { useState, useEffect } from "react";
import { tradeApi, CommitmentDetails, PendingTransaction, TradeTransaction } from "../api/client";
import { useXchPrice, formatXch } from "../hooks/useXchPrice";
import { useWalletConnect } from "../hooks/useWalletConnect";

interface CommitmentFlowProps {
  tradeId: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

type CommitmentStep = 'loading' | 'ready' | 'pending_wallet' | 'signing' | 'submitted' | 'confirmed' | 'error';

export default function CommitmentFlow({ tradeId, onSuccess, onError }: CommitmentFlowProps) {
  const { price: xchPrice } = useXchPrice();
  const { isConnected, sendTransaction, walletAddress } = useWalletConnect();
  
  const [step, setStep] = useState<CommitmentStep>('loading');
  const [details, setDetails] = useState<CommitmentDetails | null>(null);
  const [_pendingTx, setPendingTx] = useState<PendingTransaction | null>(null);
  const [transactions, setTransactions] = useState<TradeTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Calculate XCH amount dynamically from USD fee
  const feeUsd = details?.commitment_fee_usd ?? 1.0;
  const feeXch = xchPrice > 0 ? feeUsd / xchPrice : 0;
  const feeMojos = Math.floor(feeXch * 1_000_000_000_000);

  // Load commitment details and existing transactions
  useEffect(() => {
    loadDetails();
  }, [tradeId]);

  const loadDetails = async () => {
    try {
      setStep('loading');
      setError(null);
      
      const [commitDetails, txList] = await Promise.all([
        tradeApi.getCommitmentDetails(tradeId),
        tradeApi.listTransactions(tradeId).catch(() => [])
      ]);
      
      setDetails(commitDetails);
      setTransactions(txList);
      
      // Check if user already has a pending or confirmed commitment
      const userTx = txList.find(tx => 
        tx.tx_type === 'commitment_fee' && 
        ['pending', 'mempool', 'confirmed'].includes(tx.status)
      );
      
      if (userTx) {
        if (userTx.status === 'confirmed') {
          setStep('confirmed');
        } else {
          setStep('submitted');
        }
      } else if (commitDetails.user_commit_status === 'confirmed') {
        setStep('confirmed');
      } else {
        setStep('ready');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load commitment details');
      setStep('error');
    }
  };

  const startCommitment = async () => {
    if (!details) return;
    
    // Validate we have a valid XCH price
    if (xchPrice <= 0 || feeMojos < 1000) {
      setError('Unable to calculate fee. Please refresh and try again.');
      return;
    }
    
    try {
      setStep('pending_wallet');
      setError(null);
      
      // Create pending transaction record with dynamically calculated fee
      const pending = await tradeApi.createPendingCommitment(tradeId, feeMojos, walletAddress || undefined);
      setPendingTx(pending);
      
      // Check if wallet is connected
      if (!isConnected) {
        setError('Please connect your wallet first');
        setStep('ready');
        return;
      }
      
      setStep('signing');
      
      // Request transaction from wallet
      const txId = await sendTransaction({
        to: pending.to_address,
        amount: pending.amount_mojos,
        memo: pending.memo,
      });
      
      if (!txId) {
        setError('Transaction was cancelled or failed');
        setStep('ready');
        return;
      }
      
      // Submit tx_id to backend
      await tradeApi.submitCommitmentTx(pending.transaction_id, txId);
      
      setStep('submitted');
      onSuccess?.();
      
    } catch (err: any) {
      setError(err.message || 'Failed to create commitment');
      setStep('ready');
      onError?.(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600';
      case 'mempool': 
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return '✓';
      case 'mempool': 
      case 'pending': return '⏳';
      case 'failed': return '✗';
      default: return '○';
    }
  };

  if (step === 'loading') {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (step === 'error' && !details) {
    return (
      <div className="card bg-red-50 border border-red-200">
        <h3 className="font-semibold text-red-800 mb-2">Unable to Load Commitment</h3>
        <p className="text-red-600 text-sm mb-3">{error}</p>
        <button onClick={loadDetails} className="btn-secondary text-sm">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-lg mb-4">Commit to Trade</h3>
      
      {/* Commitment Status */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-600">Your Status:</span>
          <span className={`font-medium ${getStatusColor(details?.user_commit_status || 'pending')}`}>
            {getStatusIcon(details?.user_commit_status || 'pending')} {details?.user_commit_status || 'Pending'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Other Party:</span>
          <span className={`font-medium ${getStatusColor(details?.other_commit_status || 'pending')}`}>
            {getStatusIcon(details?.other_commit_status || 'pending')} {details?.other_commit_status || 'Pending'}
          </span>
        </div>
      </div>

      {/* Fee Details */}
      {details && (
        <div className="mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-600 text-lg">💰</span>
              <h4 className="font-semibold text-amber-800">Exchange Commitment Fee</h4>
            </div>
            <p className="text-sm text-amber-700 mb-3">
              This fee is paid to the DTREX exchange to secure your trade. Both parties must pay to lock the trade.
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-green-600">
                ${feeUsd.toFixed(2)} USD
              </span>
              <span className="text-sm text-gray-600">
                = {formatXch(feeXch)} XCH
              </span>
              <span className="text-xs text-gray-400">
                @ ${xchPrice.toFixed(2)}/XCH
              </span>
            </div>
            <div className="text-xs text-amber-700 bg-amber-100 rounded p-2 mt-2">
              <span className="font-medium">Recipient:</span> DTREX Exchange Wallet
              <div className="font-mono mt-1 text-amber-600 break-all">
                {details.exchange_wallet_address}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {step === 'ready' && (
        <>
          {!isConnected ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-700">
                Please connect your Sage wallet to pay the commitment fee.
              </p>
            </div>
          ) : (
            <button
              onClick={startCommitment}
              className="btn-primary w-full py-3"
            >
              Pay Commitment Fee
            </button>
          )}
        </>
      )}

      {step === 'pending_wallet' && (
        <div className="text-center py-4">
          <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-600">Creating transaction...</p>
        </div>
      )}

      {step === 'signing' && (
        <div className="text-center py-4">
          <div className="animate-pulse text-4xl mb-3">🔐</div>
          <p className="text-gray-600 font-medium">Please approve in your wallet</p>
          <p className="text-sm text-gray-500">Check your Sage wallet to sign the transaction</p>
        </div>
      )}

      {step === 'submitted' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-3xl mb-2">⏳</div>
          <h4 className="font-medium text-blue-800">Transaction Submitted</h4>
          <p className="text-sm text-blue-600 mt-1">
            Waiting for blockchain confirmation...
          </p>
          <button onClick={loadDetails} className="text-blue-600 underline text-sm mt-2">
            Refresh Status
          </button>
        </div>
      )}

      {step === 'confirmed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-3xl mb-2">✓</div>
          <h4 className="font-medium text-green-800">Commitment Confirmed</h4>
          <p className="text-sm text-green-600 mt-1">
            {details?.other_commit_status === 'confirmed' 
              ? 'Both parties have committed! Trade is now locked.'
              : 'Waiting for the other party to commit...'}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && step !== 'error' && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Transaction History</h4>
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className={getStatusColor(tx.status)}>
                    {getStatusIcon(tx.status)}
                  </span>
                  <span className="ml-2">{formatXch(tx.amount_mojos / 1_000_000_000_000)} XCH</span>
                </div>
                <div className="text-gray-500">
                  {tx.tx_id && (
                    <span className="font-mono text-xs">
                      {tx.tx_id.slice(0, 8)}...
                    </span>
                  )}
                  <span className="ml-2 capitalize">{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
        <p className="font-medium text-gray-700 mb-1">How Commitment Fees Work:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Both parties pay a commitment fee to the <strong>DTREX Exchange</strong></li>
          <li>This fee locks both parties into the trade agreement</li>
          <li>Fees help prevent spam and ensure serious traders</li>
          <li>Once both parties commit, the trade moves to escrow phase</li>
        </ul>
      </div>
    </div>
  );
}
