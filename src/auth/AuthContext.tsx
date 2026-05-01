import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '../types/eco-mobile';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'vinamed-session';
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hora de inactividad

function readSessionFromStorage(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uid?: string; rut?: string; name?: string; role?: string; lastActivity?: number };
    if (!parsed.uid || !parsed.rut || !parsed.name || !parsed.role) return null;
    const elapsed = Date.now() - (parsed.lastActivity ?? 0);
    if (elapsed > INACTIVITY_LIMIT_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { uid: parsed.uid, rut: parsed.rut, name: parsed.name, role: parsed.role };
  } catch {
    return null;
  }
}

function writeSessionToStorage(user: AuthUser): void {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ uid: user.uid, rut: user.rut, name: user.name, role: user.role, lastActivity: Date.now() }),
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => readSessionFromStorage());

  const login = useCallback((userData: AuthUser) => {
    writeSessionToStorage(userData);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const syncAcrossTabs = () => setUser(readSessionFromStorage());
    window.addEventListener('storage', syncAcrossTabs);
    return () => window.removeEventListener('storage', syncAcrossTabs);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Actualiza el timestamp de actividad en el storage
    const updateActivity = () => {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        parsed.lastActivity = Date.now();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
      } catch (e) { /* ignore */ }
    };

    // Throttle: solo actualizamos cada 30 segundos máximo para no saturar el storage
    let lastUpdate = Date.now();
    const handleUserAction = () => {
      const now = Date.now();
      if (now - lastUpdate > 30_000) {
        updateActivity();
        lastUpdate = now;
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(ev => window.addEventListener(ev, handleUserAction));

    const interval = setInterval(() => {
      if (!readSessionFromStorage()) {
        setUser(null);
      }
    }, 30_000);

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleUserAction));
      clearInterval(interval);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
