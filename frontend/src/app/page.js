"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/signup");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Welcome to Athena</h1>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Email:</span>{" "}
                {user?.email || "Not available"}
              </p>
              <p>
                <span className="font-medium">User ID:</span>{" "}
                {user?.id || "Not available"}
              </p>
              <p>
                <span className="font-medium">Created:</span>{" "}
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "Not available"}
              </p>
              <p>
                <span className="font-medium">Last Sign In:</span>{" "}
                {user?.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString()
                  : "Not available"}
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">
              ✅ You are authenticated! Your session is being maintained automatically.
            </p>
            <p className="text-sm text-green-600 mt-2">
              Refresh this page - you won't need to log in again!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
