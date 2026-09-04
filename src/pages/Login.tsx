import React, { useState } from "react";
import { useToast } from "@chakra-ui/react";
import { FcGoogle } from "react-icons/fc";
import { FaXTwitter } from "react-icons/fa6";
import { supabase } from "../lib/supabase";
import { CadenceButton } from "../components/ui/CadenceButton";
import { CadenceCard } from "../components/ui/CadenceCard";

export function LoginPage({
  onSwitchToSignup,
  onLoginSuccess
}: {
  onSwitchToSignup: () => void;
  onLoginSuccess: (username: string) => void;
}) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleSocialLogin = async (provider: 'google' | 'twitter') => {
    try {
      setLoadingProvider(provider);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setLoadingProvider(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (e.target as any)[0].value;
    const password = (e.target as any)[1].value;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // App.tsx auth listener handles redirection to dashboard
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-text-primary flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-11 w-11 rounded-xl bg-brand flex items-center justify-center shadow-sm">
            <svg
              className="w-6 h-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Log in to Cadence
          </h1>
          <p className="text-sm text-text-secondary">
            Continue your diagnostic speech coaching journey
          </p>
        </div>

        {/* Card Container */}
        <CadenceCard elevation="default" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full h-11 px-3.5 rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-all text-sm"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full h-11 px-3.5 rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-all text-sm"
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-border text-brand focus:ring-focus-ring accent-brand cursor-pointer"
              />
              <label
                htmlFor="remember-me"
                className="ml-2.5 block text-xs font-medium text-text-secondary cursor-pointer select-none"
              >
                Remember me
              </label>
            </div>

            {/* Submit CTA */}
            <CadenceButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              loadingText="Signing in..."
            >
              Continue
            </CadenceButton>
          </form>

          {/* Social Auth Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-3 text-text-muted uppercase tracking-wider font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Auth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <CadenceButton
              type="button"
              variant="outline"
              size="md"
              leftIcon={<FcGoogle className="w-5 h-5" />}
              onClick={() => handleSocialLogin('google')}
              isLoading={loadingProvider === 'google'}
            >
              Google
            </CadenceButton>

            <CadenceButton
              type="button"
              variant="outline"
              size="md"
              leftIcon={<FaXTwitter className="w-4 h-4 text-text-primary" />}
              onClick={() => handleSocialLogin('twitter')}
              isLoading={loadingProvider === 'twitter'}
            >
              Twitter
            </CadenceButton>
          </div>

          {/* Secondary Links */}
          <div className="mt-6 pt-5 border-t border-border space-y-2 text-center text-xs text-text-secondary">
            <div>
              Forgot password?{" "}
              <button
                type="button"
                className="font-medium text-brand hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm"
              >
                Reset it
              </button>
            </div>
            <div>
              New to Cadence?{" "}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="font-medium text-brand hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm"
              >
                Create an account
              </button>
            </div>
          </div>
        </CadenceCard>
      </div>
    </div>
  );
}

export default LoginPage;
