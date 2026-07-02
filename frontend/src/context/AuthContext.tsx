import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string, purpose?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState<string | null>(localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [token]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string, role = 'recruiter') => {
    await api.post('/auth/register', { name, email, password, role });
  };

  const verifyEmail = async (email: string, otp: string) => {
    await api.post('/auth/verify-email', { email, otp });
  };

  const resendOtp = async (email: string, purpose = 'email-verification') => {
    await api.post('/auth/resend-otp', { email, purpose });
  };

  const forgotPassword = async (email: string) => {
    await api.post('/auth/forgot-password', { email });
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    await api.post('/auth/reset-password', { email, otp, newPassword });
  };

  const logout = async () => {
    try {
      const rt = localStorage.getItem('refreshToken');
      if (rt) {
        await api.post('/auth/logout', { refreshToken: rt });
      }
    } catch (_) {}
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        login,
        register,
        verifyEmail,
        resendOtp,
        forgotPassword,
        resetPassword,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
