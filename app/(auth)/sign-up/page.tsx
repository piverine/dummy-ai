// app/(auth)/signup/page.tsx
import AuthForm from "@/components/AuthForm";

const Page = () => {
  // Render only the AuthForm component for the sign-up type
  return <AuthForm type="sign-up" />;
};

export default Page;