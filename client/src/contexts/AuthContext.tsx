import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { login as apiLogin, register as apiRegister, getCurrentUser, logout as apiLogout } from "../api/auth";

type User = {
  _id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string;
  isActive: boolean;
  factories?: Array<{ _id: string; name?: string; code?: string }>;
  defaultFactory?: string;
  activeFactory?: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  isInitializing: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const refreshUserData = async () => {
    if (!localStorage.getItem("accessToken")) return;

    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      logout();
    }
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const existingToken = localStorage.getItem("accessToken");
        if (!existingToken) {
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        const userData = await getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("accessToken");
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiLogin(email, password);
      if (response?.refreshToken || response?.accessToken) {
        localStorage.setItem("refreshToken", response.refreshToken);
        localStorage.setItem("accessToken", response.accessToken);
        setUser({
          _id: response._id,
          email: response.email,
          role: response.role,
          createdAt: response.createdAt,
          lastLoginAt: response.lastLoginAt,
          isActive: response.isActive,
          factories: response.factories,
          defaultFactory: response.defaultFactory,
          activeFactory: response.activeFactory,
        });
        setIsAuthenticated(true);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("accessToken");
      setIsAuthenticated(false);
      setUser(null);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      throw new Error(errorMessage);
    }
  };

  const register = async (email: string, password: string, role?: string) => {
    try {
      const response = await apiRegister(email, password, role);
      // Registration successful, but user needs to login
      console.log('Registration successful:', response);
    } catch (error) {
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("accessToken");
      setIsAuthenticated(false);
      setUser(null);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore logout API errors
    } finally {
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("accessToken");
      setIsAuthenticated(false);
      setUser(null);
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isInitializing, user, login, register, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
