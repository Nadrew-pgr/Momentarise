import { SignupForm } from "@/components/signup-form";
import { AppLogo } from "@/components/app-logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte | Momentarise",
  description: "Créez votre compte Momentarise",
};

export default function SignupPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <AppLogo />
        <SignupForm />
      </div>
    </div>
  );
}
