// components/AuthForm.tsx
"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm, UseFormReturn } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import { signIn, signUp } from "@/lib/actions/auth.action";
import FormField from "./FormField";
import GoogleLoginButton from "./auth/GoogleLoginButton"; // Import the button

type FormType = "sign-in" | "sign-up";

const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3, { message: 'Name must be at least 3 characters.' }) : z.string().optional(),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  });
};

type AuthFormValues = z.infer<ReturnType<typeof authFormSchema>>;

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();
  const isSignIn = type === "sign-in";

  const formSchema = authFormSchema(type);

  const form: UseFormReturn<AuthFormValues> = useForm<AuthFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: AuthFormValues) => {
    try {
      if (type === "sign-up") {
        const { name, email, password } = data;
        if (!name) throw new Error("Name is required for sign up.");

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const result = await signUp({
          uid: userCredential.user.uid,
          name: name,
          email,
          password,
        });
        if (!result.success) {
          toast.error(result.message || "Sign up failed on server.");
          return;
        }
        toast.success("Account created successfully. Please sign in.");
        router.push("/sign-in");
      } else { // Sign In
        const { email, password } = data;
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        if (!idToken) {
          toast.error("Sign in failed: Could not get ID token.");
          return;
        }
        const result = await signIn({ email, idToken });
        if (result && result.success === false) {
            toast.error(result.message || "Sign in failed on server.");
            return;
        }
        toast.success("Signed in successfully.");
        router.push("/");
      }
    } catch (error: any) {
      console.error("AuthForm Error:", error);
      let errorMessage = "An unexpected error occurred.";
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "This email is already registered. Please sign in.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            break;
          case 'auth/weak-password':
            errorMessage = "Password is too weak. Please use at least 6 characters.";
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "Invalid email or password.";
            break;
          default:
            errorMessage = `Authentication failed: ${error.message || error.code}`;
        }
      } else if (error.message) {
          errorMessage = error.message;
      }
      toast.error(errorMessage);
    }
  };

  return (
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        {/* Header */}
        <div className="flex flex-row gap-2 justify-center items-center">
          <Image src="/logo.svg" alt="logo" height={32} width={38} />
          <h2 className="text-primary-100">PrepWise</h2>
        </div>
        <h3 className="text-center">Practice job interviews with AI</h3>

        {/* Email/Password Form */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6 mt-4 flex flex-col"
          >
            {!isSignIn && (
              <FormField control={form.control} name="name" label="Name" placeholder="Your Name" type="text" />
            )}
            <FormField control={form.control} name="email" label="Email" placeholder="your@email.com" type="email" />
            <FormField control={form.control} name="password" label="Password" placeholder="Enter your password" type="password" />
            <Button className="btn w-full mt-2" type="submit" disabled={isSubmitting}>
               {isSubmitting ? "Submitting..." : (isSignIn ? "Sign In" : "Create an Account")}
            </Button>
          </form>
        </Form>

        {/* Link to toggle Sign In / Sign Up */}
        <p className="text-center text-sm mt-4">
          {isSignIn ? "No account yet?" : "Have an account already?"}
          <Link
            href={isSignIn ? "/sign-up" : "/sign-in"}
            className="font-semibold text-user-primary hover:underline ml-1"
          >
            {isSignIn ? "Sign Up" : "Sign In"}
          </Link>
        </p>

        {/* --- Google Button Section (Now Always Rendered) --- */}
        <>
            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            {/* Google Login Button */}
            <GoogleLoginButton />
        </>
        {/* --- End Google Button Section --- */}

      </div>
    </div>
  );
};

export default AuthForm;