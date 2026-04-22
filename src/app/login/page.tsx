"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { auth, googleProvider, signInWithPopup } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // router.push("/dashboard") is handled by AuthContext
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="card max-w-md w-full mx-4 flex flex-col items-center p-8">
        <div className="w-16 h-16 bg-accent text-primary rounded-full flex items-center justify-center mb-6">
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-2xl mb-2 text-center">Welcome to FairLend AI</h1>
        <p className="text-muted-foreground text-center mb-8">
          Sign in to access your fairness audit dashboard and compliance reports.
        </p>

        {error && (
          <div className="w-full bg-destructive text-destructive-foreground p-3 rounded-md flex items-center gap-2 mb-6 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="btn w-full bg-white border border-border text-foreground hover:bg-muted flex items-center justify-center gap-3 py-3"
        >
          {isLoading ? (
            <span className="text-muted-foreground">Signing in...</span>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l2.85-2.22.83-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        <p className="text-xs text-muted-foreground text-center mt-8">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
