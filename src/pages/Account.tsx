
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const Account = () => {
  const [email, setEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
        setNewEmail(user.email);
      }
    };
    getUser();
  }, []);

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password",
        variant: "destructive"
      });
      return;
    }
    
    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      setNewPassword('');
    }
    setIsUpdating(false);
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === email) {
      toast({
        title: "Error",
        description: "Please enter a new email address",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({
      email: newEmail
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Verification email sent. Please check your inbox.",
      });
    }
    setIsUpdating(false);
  };

  const handleSignOut = async () => {
    try {
      console.log('Starting sign out process from account page...');
      
      // Force sign out with scope: 'local' to ensure it works
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) {
        console.error('Sign out error:', error);
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Sign out successful');
      
      // Clear any local storage items that might persist
      localStorage.removeItem('supabase.auth.token');
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      
      // Force navigation to home page
      window.location.href = '/';
      
    } catch (error) {
      console.error('Unexpected sign out error:', error);
      toast({
        title: "Error", 
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
          
          <div className="space-y-6">
            {/* Email Update Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Update Email</h3>
              <div className="space-y-2">
                <Label htmlFor="current-email">Current Email</Label>
                <Input id="current-email" value={email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">New Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email"
                />
              </div>
              <Button 
                onClick={handleUpdateEmail}
                disabled={isUpdating || newEmail === email}
              >
                Update Email
              </Button>
            </div>

            <hr className="my-6" />

            {/* Password Update Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Change Password</h3>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <Button 
                onClick={handleUpdatePassword}
                disabled={isUpdating || !newPassword}
              >
                Update Password
              </Button>
            </div>

            <hr className="my-6" />

            {/* Subscription Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Subscription</h3>
              <p className="text-sm text-gray-600">
                Current Plan: Free
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/pricing')}
              >
                Upgrade Plan
              </Button>
            </div>

            <hr className="my-6" />

            {/* Sign Out Section */}
            <div>
              <Button variant="destructive" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Account;
