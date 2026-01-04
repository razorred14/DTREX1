import { useState, useEffect } from 'react';

interface XchPriceData {
  price: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const FALLBACK_PRICE = 4.77; // Fallback if API fails
const CACHE_KEY = 'xch_price_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedPrice {
  price: number;
  timestamp: number;
}

/**
 * Hook to fetch real-time XCH price from CoinGecko API
 * Falls back to cached price or default if API fails
 */
export function useXchPrice(): XchPriceData {
  const [price, setPrice] = useState<number>(FALLBACK_PRICE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      // Check cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { price: cachedPrice, timestamp }: CachedPrice = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setPrice(cachedPrice);
            setLastUpdated(new Date(timestamp));
            setLoading(false);
            return;
          }
        }
      } catch {
        // Ignore cache errors
      }

      try {
        // CoinGecko free API - no key required
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=chia&vs_currencies=usd',
          { 
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000) // 5 second timeout
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.chia?.usd) {
          const newPrice = data.chia.usd;
          setPrice(newPrice);
          setLastUpdated(new Date());
          setError(null);

          // Cache the price
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            price: newPrice,
            timestamp: Date.now()
          }));
        } else {
          throw new Error('Invalid API response');
        }
      } catch (err) {
        console.warn('Failed to fetch XCH price:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch price');
        // Keep using cached/fallback price
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();

    // Refresh price every 5 minutes
    const interval = setInterval(fetchPrice, CACHE_DURATION);
    return () => clearInterval(interval);
  }, []);

  return { price, loading, error, lastUpdated };
}

/**
 * Convert USD to XCH
 */
export function usdToXch(usd: number, xchPrice: number): number {
  return usd / xchPrice;
}

/**
 * Convert XCH to USD
 */
export function xchToUsd(xch: number, xchPrice: number): number {
  return xch * xchPrice;
}

/**
 * Format XCH amount with appropriate decimals
 */
export function formatXch(amount: number): string {
  if (amount >= 1) {
    return amount.toFixed(4);
  } else if (amount >= 0.0001) {
    return amount.toFixed(6);
  } else {
    return amount.toFixed(12);
  }
}
