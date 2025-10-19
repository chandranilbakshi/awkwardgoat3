"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const accessToken = localStorage.getItem("access_token");
      
      if (!accessToken) {
        setLoading(false);
        return;
      }

      // Verify token with backend
      const response = await fetch("http://localhost:8080/api/auth/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token is invalid, try to refresh
        await refreshSession();
      }
    } catch (error) {
      console.error("Auth check error:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      
      if (!refreshToken) {
        logout();
        return;
      }

      const response = await fetch("http://localhost:8080/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        setUser(data.user);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error("Refresh error:", error);
      logout();
      return false;
    }
  };

  const login = (accessToken, refreshToken, userData) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    router.push("/signup");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshSession,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
