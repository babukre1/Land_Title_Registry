import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authService from "../services/authService.js";

const AuthContext = createContext(null);

/** Loads the cookie-backed session and exposes safe login/logout state to protected pages. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const signIn = useCallback(async (credentials) => {
    const signedInUser = await authService.login(credentials);
    setUser(signedInUser);
    return signedInUser;
  }, []);

  const signOut = useCallback(async () => {
    try { await authService.logout(); } finally { setUser(null); }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut, refreshUser }),
    [user, isLoading, signIn, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
