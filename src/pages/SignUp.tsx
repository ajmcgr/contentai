
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";
import { BrandOnboardingDialog } from "@/components/BrandOnboardingDialog";

export const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const sendWelcomeEmail = async (userEmail: string) => {
    try {
      await supabase.functions.invoke('send-email-with-config', {
        body: {
          to: userEmail,
          subject: "Welcome to TryContent",
          html: "<p>Thanks for signing up to TryContent! We're excited to have you onboard.</p>"
        }
      });
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      // Don't throw - welcome email failure shouldn't break signup flow
    }
  };

  useEffect(() => {
    // Trigger onboarding only when session exists (e.g., after Google OAuth)
    if (searchParams.get('onboarding') === 'true') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setShowOnboarding(true);
      });
    }
  }, [searchParams]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Starting custom signup flow");

      // Create user account without email verification
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Disable built-in email verification
        }
      });

      if (signUpError) {
        // Handle existing user case
        if (signUpError.message.includes("already registered") || signUpError.message.includes("already")) {
          toast({
            title: "Account exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive"
          });
          return;
        }
        throw signUpError;
      }

      const user = signUpData.user;
      if (!user) {
        throw new Error("Failed to create user account");
      }

      console.log("User created, generating verification token");

      // Generate verification token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('generate-verification-token', {
        body: { userId: user.id }
      });

      if (tokenError) {
        console.error("Token generation failed:", tokenError);
        throw new Error("Failed to generate verification token");
      }

      console.log("Token generated, sending verification email");

      // Send verification email using our custom system
      const { error: emailError } = await supabase.functions.invoke('send-email-with-config', {
        body: {
          to: email,
          subject: "Welcome to Content AI",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333; text-align: center;">Welcome to TryContent!</h1>
              <p style="color: #666; font-size: 16px;">Thanks for signing up! Please verify your email address to complete your account setup.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${tokenData.verificationUrl}" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Verify Email Address
                </a>
              </div>
              <p style="color: #999; font-size: 14px;">
                This link will expire in 60 minutes. If you didn't sign up for TryContent, please ignore this email.
              </p>
              <p style="color: #999; font-size: 14px;">
                If the button doesn't work, copy and paste this link: ${tokenData.verificationUrl}
              </p>
            </div>
          `,
          text: `Welcome to TryContent!\nPlease verify your email: ${tokenData.verificationUrl}\nThis link expires in 60 minutes.`
        }
      });

      if (emailError) {
        console.error("Email sending failed:", emailError);
        // Don't throw here - account is created, just email failed
        toast({
          title: "Account created",
          description: "Account created but verification email failed to send. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      console.log("Verification email sent successfully");

      toast({
        title: "Account created!",
        description: "Please check your email and click the verification link to complete setup."
      });

      // Redirect to sign in with a message
      navigate("/signin?message=verify-email&email=" + encodeURIComponent(email));

    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Signup failed",
        description: error.message || "An error occurred during signup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/signup?onboarding=true`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error signing up with Google",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOnboardingComplete = async () => {
    // Send welcome email for Google OAuth users
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      await sendWelcomeEmail(user.email);
    }
    setShowOnboarding(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex flex-col items-center">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-8">Create an Account</h1>
        <form onSubmit={handleSignUp} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Choose a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"} <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </form>
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full mt-4"
            onClick={handleGoogleSignUp}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign up with Google <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </Card>
      
      <BrandOnboardingDialog 
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
};
