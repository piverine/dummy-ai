import { signInWithPopup, signOut, User } from "firebase/auth";
// Import client-side auth directly
import { auth } from "../firebase/client";
// Import the specific provider type you need
import { GoogleAuthProvider } from "firebase/auth";

// Initialize the provider needed for signInWithPopup
const provider = new GoogleAuthProvider();

// If you already export 'provider' from client.ts, you could do:
// import { auth, provider } from "../firebase/client";

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    return null;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
  }
};
