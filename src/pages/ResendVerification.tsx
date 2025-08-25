import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ResendVerification() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get the current user (if signed in)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Not Signed In",
          description: "Please sign in first to resend verification email",
          variant: "destructive"
        });
        navigate('/signin');
        return;
      }

      // Generate new verification token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('generate-verification-token', {
        body: { userId: user.id }
      });

      if (tokenError) throw tokenError;

      // Send verification email
      const { error: emailError } = await supabase.functions.invoke('send-email-with-config', {
        body: {
          to: email,
          subject: "Verify your TryContent account",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333; text-align: center;">Welcome to TryContent!</h1>
              <p style="color: #666; font-size: 16px;">Please verify your email address to complete your account setup.</p>
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

      if (emailError) throw emailError;

      toast({
        title: "Verification Email Sent",
        description: "Please check your email and click the verification link"
      });

      // Navigate to a confirmation page
      navigate('/signin?message=verification-sent');

    } catch (error: any) {
      console.error('Resend verification error:', error);
      toast({
        title: "Failed to Send Email",
        description: error.message || "Unable to send verification email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Mail className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Resend Verification</CardTitle>
          <CardDescription>
            Enter your email address to receive a new verification link
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleResend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Verification Email
            </Button>
            
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full" 
              onClick={() => navigate('/signin')}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}