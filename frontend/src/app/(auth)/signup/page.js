"use client";
import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch("http://localhost:8080/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Magic link sent! Check your email.");
        setEmail("");
      } else {
        setMessage(data.error || "Failed to send magic link. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("An error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-6 rounded-xl shadow-[0_0_50px_rgba(80,80,80,0.5)] bg-white">
        <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </label>
          <button type="submit" className="py-2 rounded-lg bg-gray-800 hover:bg-black text-white font-semibold transition-colors">
            Join now!
          </button>
          {message && (
            <div className={`text-center font-medium ${message.includes("error") || message.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
