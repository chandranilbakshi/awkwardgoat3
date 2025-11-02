"use client";
import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/signup`, {
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
    <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e] px-4">
      <div className="max-w-md w-full p-8 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] bg-[#252526] border border-[#3e3e42] transition-all duration-300 hover:shadow-[0_0_80px_rgba(0,0,0,0.95)]">
        <h2 className="text-3xl font-bold text-center mb-2 text-[#d4d4d4] tracking-tight">Sign Up</h2>
        <p className="text-center text-sm text-[#858585] mb-8">Enter your email to get started</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <label className="flex flex-col gap-2 font-medium text-[#d4d4d4]">
            <span className="text-sm">Email Address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg border border-[#3e3e42] bg-[#3c3c3c] text-[#d4d4d4] focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent placeholder-[#858585] transition-all duration-200 hover:border-[#505050]"
            />
          </label>
          
          <button 
            type="submit" 
            className="py-3 px-6 rounded-lg bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-semibold transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            Join now!
          </button>
          
          {message && (
            <div className={`text-center font-medium text-sm px-4 py-3 rounded-lg transition-all duration-300 ${
              message.includes("error") || message.includes("Failed") 
                ? "text-red-400 bg-red-900/20 border border-red-700/30" 
                : "text-green-400 bg-green-900/20 border border-green-700/30"
            }`}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
