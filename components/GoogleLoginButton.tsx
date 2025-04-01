"use client"; // Required for Next.js App Router

import { useState, useEffect } from "react";
import { signInWithGoogle, logout } from "../utils/auth"; // Corrected path assuming utils is at the root
import { auth } from "../firebase/client"; // <-- Import from client.ts
import { User } from "firebase/auth";
import { useRouter } from 'next/navigation'; // <-- Import the router hook

export default function GoogleLoginButton() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter(); // <-- Initialize the router

  // Effect to check initial auth state and listen for changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      // Optional: If user is already logged in when component mounts, redirect immediately
      // if (currentUser) {
      //   router.push('/'); // Redirect to dashboard
      // }
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, [router]); // <-- Add router to dependency array if used inside useEffect

  // Handle the sign-in action
  const handleSignIn = async () => {
    const loggedInUser = await signInWithGoogle();
    if (loggedInUser) {
      // Sign-in successful, NOW redirect
      router.push('/'); // <-- Redirect to the root path which maps to /app/(root)/page.tsx
    } else {
      // Handle sign-in failure (optional: show error message)
      console.error("Sign-in failed.");
    }
  };

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.displayName}</p>
          <img
            src={user.photoURL || ""}
            alt={user.displayName || "Profile"} // Add alt text
            width={50}
            height={50}
            style={{ borderRadius: '50%' }} // Make image round
          />
          <button onClick={logout}>Logout</button> {/* Logout should also ideally redirect */}
        </div>
      ) : (
        // Use the handleSignIn function for the button's onClick
        <button onClick={handleSignIn}>Sign in with Google</button>
      )}
    </div>
  );
}