"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Processing authentication...");

  useEffect(() => {
    const handleAuth = async () => {
      // Get the hash fragment from URL which contains the tokens
      const hash = window.location.hash;
    
    if (hash) {
      // Parse the hash parameters
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const error = params.get("error");
      const errorDescription = params.get("error_description");

      if (error) {
        setStatus(`Authentication failed: ${errorDescription || error}`);
        setTimeout(() => router.push("/signup"), 3000);
        return;
      }

      if (accessToken) {
        // Store tokens
        localStorage.setItem("access_token", accessToken);
        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
        }

        // Fetch user data
        try {
          const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            localStorage.setItem("user", JSON.stringify(userData.user));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }

        setStatus("Authentication successful! Redirecting...");
        
        // Redirect to chat page
        setTimeout(() => router.push("/"), 1500);
      } else {
        setStatus("No authentication token found. Redirecting...");
        setTimeout(() => router.push("/signup"), 2000);
      }
    } else {
      setStatus("No authentication data found. Redirecting...");
      setTimeout(() => router.push("/signup"), 2000);
    }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e]">
      <div className="max-w-md w-full p-8 bg-[#252526] border border-[#3e3e42] rounded-xl shadow-2xl text-center">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
        </div>
        <h2 className="text-xl font-semibold mb-2 text-[#d4d4d4]">Authenticating</h2>
        <p className="text-[#858585]">{status}</p>
      </div>
    </div>
  );
}
