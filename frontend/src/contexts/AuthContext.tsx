import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authApi, tokenManager } from '../api/auth';
import { disconnectWallet } from '../wallet/walletConnect';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user and token from localStorage on mount
  useEffect(() => {
    const savedToken = tokenManager.getToken();
    const savedUser = tokenManager.getUser();

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login({ username, pwd: password });
      
      setToken(response.token);
      setUser(response.user);
      
      tokenManager.setToken(response.token);
      tokenManager.setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const response = await authApi.register({ username, pwd: password });
      
      setToken(response.token);
      setUser(response.user);
      
      tokenManager.setToken(response.token);
      tokenManager.setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear wallet connection on logout for security
      await disconnectWallet();
      setToken(null);
      setUser(null);
      tokenManager.clear();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
