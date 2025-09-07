import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar?: string;
  role: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("authToken"));
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!token,
    retry: false,
  });

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    localStorage.setItem("authToken", newToken);
    queryClient.setQueryData(["/api/auth/me"], userData);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("authToken");
    queryClient.clear();
  };

  // Set up axios interceptor for token
  useEffect(() => {
    const interceptor = (config: any) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    };

    // This would be set up in a real axios instance
    // For now, we'll handle it in individual requests
  }, [token]);

  const value = {
    user: user || null,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
