import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Globe, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";

interface BrandOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function BrandOnboardingDialog({ open, onOpenChange, onComplete }: BrandOnboardingDialogProps) {
  const [step, setStep] = useState<'welcome' | 'scan' | 'success'>('welcome');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedInfo, setScannedInfo] = useState<any>(null);
  const { toast } = useToast();

  const handleScanWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter your website URL",
        variant: "destructive",
      });
      return;
    }

    // Check authentication first and show helpful dialog
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast({
        title: "Sign In Required",
        description: "Please verify your email and sign in, or use Google sign-in to scan your website.",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    try {

      const { data, error } = await supabase.functions.invoke('scan-website', {
        body: { url: websiteUrl }
      });

      if (error) {
        console.error('Scan error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to scan website');
      }

      setScannedInfo(data.extracted_info);
      setStep('success');
      
      toast({
        title: "Website Scanned Successfully!",
        description: "Your brand settings have been automatically configured.",
      });
    } catch (error) {
      console.error('Error scanning website:', error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Failed to scan website. You can set up your brand manually in settings.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSkip = () => {
    onComplete();
    onOpenChange(false);
  };

  const handleComplete = () => {
    onComplete();
    onOpenChange(false);
    // Navigate to brand settings if they want to review
    toast({
      title: "Setup Complete!",
      description: "You can review and edit your brand settings anytime in the Settings page.",
    });
  };

  const renderWelcome = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h3 className="text-xl font-reckless font-medium mb-2">Welcome to Content AI!</h3>
        <p className="text-muted-foreground">
          Let's personalize your experience by learning about your brand. 
          We'll scan your website to automatically set up your brand settings.
        </p>
      </div>
      <div className="space-y-4">
        <Button onClick={() => setStep('scan')} className="w-full">
          <Globe className="w-4 h-4 mr-2" />
          Scan My Website
        </Button>
        <Button variant="ghost" onClick={handleSkip} className="w-full">
          Skip for now
        </Button>
      </div>
    </div>
  );

  const renderScan = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-reckless font-medium mb-2">Scan Your Website</h3>
        <p className="text-muted-foreground">
          Enter your website URL and we'll automatically extract your brand information, 
          industry focus, and tone of voice.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="website-url">Website URL</Label>
          <Input
            id="website-url"
            type="url"
            placeholder="https://yourwebsite.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            disabled={isScanning}
          />
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleScanWebsite} 
            className="w-full" 
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning Website...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Scan & Setup Brand
              </>
            )}
          </Button>
          
          <Button variant="ghost" onClick={handleSkip} className="w-full" disabled={isScanning}>
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-xl font-reckless font-medium mb-2">Brand Setup Complete!</h3>
        <p className="text-muted-foreground mb-4">
          We've successfully analyzed your website and set up your brand profile.
        </p>
      </div>

      {scannedInfo && (
        <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
          <h4 className="font-medium">What we found:</h4>
          {scannedInfo.brand_name && <p><strong>Brand:</strong> {scannedInfo.brand_name}</p>}
          {scannedInfo.industry && <p><strong>Industry:</strong> {scannedInfo.industry}</p>}
          {scannedInfo.tone_of_voice && <p><strong>Tone:</strong> {scannedInfo.tone_of_voice}</p>}
          {scannedInfo.tags && scannedInfo.tags.length > 0 && (
            <p><strong>Topics:</strong> {scannedInfo.tags.join(', ')}</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <Button onClick={handleComplete} className="w-full">
          Start Creating Content
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            handleComplete();
            // Could navigate to settings page here
          }} 
          className="w-full"
        >
          Review Brand Settings
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Brand Onboarding</DialogTitle>
          <DialogDescription>Set up your brand profile for personalized content</DialogDescription>
        </DialogHeader>
        
        {step === 'welcome' && renderWelcome()}
        {step === 'scan' && renderScan()}
        {step === 'success' && renderSuccess()}
      </DialogContent>
    </Dialog>
  );
}