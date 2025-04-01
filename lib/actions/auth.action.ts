// lib/actions/auth.action.ts
"use server";

import { cookies } from "next/headers"; // Correct import
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"; // Explicit type import can be removed if await is used, but kept for clarity
import { auth, db } from "@/firebase/admin";

// --- Type Definitions (Ensure these match your actual types) ---

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
  password?: string;
}

interface SignInParams {
  email: string;
  idToken: string;
}

interface ProviderSignInParams {
  uid: string;
  email: string;
  name: string;
  profileURL?: string | null;
  idToken: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  profileURL?: string | null;
  createdAt?: string;
  lastLoginAt?: string;
  provider?: string;
  // Add other fields stored in your Firestore 'users' collection
}

// --- Constants ---

const SESSION_DURATION = 60 * 60 * 24 * 7; // 1 week in seconds

// --- Session Management ---

/**
 * Creates a session cookie and sets it.
 */
export async function setSessionCookie(idToken: string) {
  // Await cookies() to get the actual cookie store instance
  const cookieStore = await cookies();

  try {
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION * 1000,
    });

    // Now call .set() on the resolved cookieStore instance
    cookieStore.set("session", sessionCookie, {
      maxAge: SESSION_DURATION,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });
    console.log("Session cookie set successfully.");
  } catch (error) {
    console.error("Error creating or setting session cookie:", error);
    throw new Error("Failed to set session cookie.");
  }
}

// --- Authentication Actions ---

/**
 * Handles Email/Password Sign Up (Firestore record creation).
 */
export async function signUp(
  params: SignUpParams
): Promise<{ success: boolean; message?: string }> {
  const { uid, name, email } = params;
  try {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      console.warn(`Sign up attempt for existing user UID: ${uid}`);
      return {
        success: false,
        message: "An account with this email already exists. Please sign in.",
      };
    }

    await userRef.set({
      name: name,
      email: email,
      createdAt: new Date().toISOString(),
      provider: "email",
    });

    console.log(`User record created in Firestore for UID: ${uid}`);
    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error: any) {
    console.error("Error creating user record in Firestore:", error);
    return {
      success: false,
      message: `Failed to create account record. ${error.message || ""}`,
    };
  }
}

/**
 * Handles Email/Password Sign In (Session creation).
 */
export async function signIn(
  params: SignInParams
): Promise<{ success: boolean; message?: string }> {
  const { idToken } = params;
  try {
    // Set the session cookie using the function which now awaits cookies()
    await setSessionCookie(idToken);

    // Optionally update last login time
    const userRecord = await auth.verifyIdToken(idToken);
    await db.collection("users").doc(userRecord.uid).update({
        lastLoginAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error during Email/Password Sign In:", error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        return { success: false, message: "Invalid email or password." };
    }
     if (error.code === 'auth/id-token-expired' || error.code === 'auth/session-cookie-expired') {
         return { success: false, message: "Session expired. Please sign in again."};
     }
    return {
      success: false,
      message: `Failed to log into account. ${error.message || "Unknown error"}`,
    };
  }
}

/**
 * Handles Provider Sign In/Sign Up (Firestore record + Session).
 */
export async function signInOrSignUpWithProvider(
  params: ProviderSignInParams
): Promise<{ success: boolean; message?: string }> {
  const { uid, email, name, profileURL, idToken } = params;
  try {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`Creating new user record via provider for UID: ${uid}`);
      await userRef.set({
        name: name,
        email: email,
        profileURL: profileURL || null,
        createdAt: new Date().toISOString(),
        provider: "google", // Example
      });
    } else {
      console.log(`User found via provider UID: ${uid}. Updating details.`);
      await userRef.update({
        name: name,
        profileURL: profileURL || userDoc.data()?.profileURL || null,
        lastLoginAt: new Date().toISOString(),
        provider: userDoc.data()?.provider || "google",
      });
    }

    // Set the session cookie using the function which now awaits cookies()
    await setSessionCookie(idToken);

    return { success: true };
  } catch (error: any) {
    console.error("Error during Provider Sign-In/Sign-Up:", error);
    return {
      success: false,
      message: `Failed to sign in with provider. ${error.message || ""}`,
    };
  }
}

/**
 * Signs the user out by deleting the session cookie.
 */
export async function signOut(): Promise<void> {
  // Await cookies() to get the actual cookie store instance
  const cookieStore = await cookies();
  try {
    // Now call .has() and .delete() on the resolved cookieStore instance
    if (cookieStore.has("session")) {
      cookieStore.delete("session");
      console.log("Session cookie deleted.");
    } else {
      console.log("SignOut called, but no session cookie found to delete.");
    }
  } catch (error) {
    console.error("Error deleting session cookie:", error);
  }
}

// --- User State Retrieval ---

/**
 * Retrieves the current user based on the session cookie.
 */
export async function getCurrentUser(): Promise<User | null> {
  // Await cookies() to get the actual cookie store instance
  const cookieStore = await cookies();

  // Now call .get() on the resolved cookieStore instance
  const sessionCookieData = cookieStore.get("session");

  if (!sessionCookieData?.value) {
    return null; // No session cookie found
  }

  const sessionCookieValue = sessionCookieData.value;

  try {
    const decodedClaims = await auth.verifySessionCookie(
      sessionCookieValue,
      true // Check revocation
    );

    const userDoc = await db.collection("users").doc(decodedClaims.uid).get();

    if (!userDoc.exists) {
      console.warn(
        `User document not found in Firestore for valid session UID: ${decodedClaims.uid}`
      );
      try {
        // Call .delete() on the resolved cookieStore instance
        if (cookieStore.has("session")) { // Check again before deleting
           cookieStore.delete("session");
           console.log("Cleared session cookie for user not found in DB.");
        }
      } catch (deleteError) {
        console.error("Failed to delete session cookie for non-existent DB user:", deleteError);
      }
      return null;
    }

    const userData = userDoc.data() as Omit<User, "id">;
    return {
      id: userDoc.id,
      ...userData,
    };
  } catch (error: any) {
    console.log("Session cookie verification failed:", error.code || error.message);
    try {
      // Call .has() and .delete() on the resolved cookieStore instance
      if (cookieStore.has("session")) {
          cookieStore.delete("session");
          console.log("Cleared invalid/expired session cookie.");
      }
    } catch (deleteError) {
      console.error("Failed to delete invalid/expired session cookie:", deleteError);
    }
    return null;
  }
}

// --- Check Authentication Status ---

/**
 * Checks if a user is currently authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  // This correctly awaits getCurrentUser, which now correctly awaits cookies()
  const user = await getCurrentUser();
  return !!user;
}