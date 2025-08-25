import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already-verified'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    verifyToken(token);
  }, [searchParams]);

  const verifyToken = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-token', {
        body: { token }
      });

      if (error) throw error;

      if (data.alreadyVerified) {
        setStatus('already-verified');
        setMessage('Your email has already been verified');
      } else {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      }

      toast({
        title: "Email Verified",
        description: "You can now access all features of TryContent"
      });

    } catch (error: any) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage(error.message || 'Verification failed. The link may be invalid or expired.');
      
      toast({
        title: "Verification Failed",
        description: error.message || "The verification link is invalid or expired",
        variant: "destructive"
      });
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const handleResendVerification = () => {
    navigate('/resend-verification');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {(status === 'success' || status === 'already-verified') && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-destructive" />}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'already-verified' && 'Already Verified'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {(status === 'success' || status === 'already-verified') && (
            <Button onClick={handleContinue} className="w-full">
              Continue to Dashboard
            </Button>
          )}
          
          {status === 'error' && (
            <div className="space-y-2">
              <Button onClick={handleResendVerification} variant="outline" className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Request New Verification Email
              </Button>
              <Button onClick={() => navigate('/signin')} variant="ghost" className="w-full">
                Back to Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}