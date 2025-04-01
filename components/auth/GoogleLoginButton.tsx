// components/auth/GoogleLoginButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { toast } from "sonner";
import { FaGoogle } from "react-icons/fa";
import { useState } from "react";

import { auth } from "@/firebase/client";
import { Button } from "@/components/ui/button";
import { signInOrSignUpWithProvider } from "@/lib/actions/auth.action";

const GoogleLoginButton = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (!user) throw new Error("Google Sign-In failed, user not found.");

      const idToken = await user.getIdToken();
      if (!idToken) throw new Error("Could not retrieve ID token.");

      const backendResult = await signInOrSignUpWithProvider({
        uid: user.uid,
        email: user.email!,
        name: user.displayName || "User",
        profileURL: user.photoURL,
        idToken: idToken,
      });

      if (backendResult?.success) {
        toast.success("Signed in with Google successfully!");
        router.push("/");
      } else {
        toast.error(backendResult?.message || "Google Sign-In failed on server.");
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
           toast.error(`Google Sign-In failed: ${error.message || "Unknown error"}`);
      }
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline" // Base variant (styling is overridden)
      className={
        "w-full flex items-center justify-center gap-2 " + // Base layout styles
        "bg-red-600 text-white " + // <-- Red background, white text
        "hover:bg-red-700 " + // <-- Darker red on hover
        "focus-visible:ring-red-500 " + // <-- Red focus ring
        "border-transparent" // <-- Remove default border
       }
      type="button"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
    >
      <FaGoogle className="h-4 w-4" />
      {isLoading ? "Continuing..." : "Continue with Google"}
    </Button>
  );
};

export default GoogleLoginButton;