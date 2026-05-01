import { createContext, useContext, useState, ReactNode } from 'react';
import api from '../api';

interface AuthUser {
  fullName: string;
  role: string; // "Manager" | "Leader" | "Operator"
  userId: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  async function login(email: string, password: string): Promise<AuthUser> {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, role, full_name, user_id } = res.data;
    localStorage.setItem('token', access_token);
    const me: AuthUser = { fullName: full_name, role, userId: user_id };
    localStorage.setItem('user', JSON.stringify(me));
    setUser(me);
    return me;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
