
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { User, LogOut, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  isAuthenticated?: boolean;
}

export const Header = ({ isAuthenticated }: HeaderProps) => {
  const navigate = useNavigate();
  const { user } = useSubscription();
  const { toast } = useToast();
  const authed = !!user;

  const handleSignOut = async () => {
    try {
      console.log('Starting sign out process...');
      
      // Sign out globally to revoke refresh tokens
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
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
      
      // Force navigation to home page instead of signin
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
    <header className="bg-white w-full h-16">
      <div className={`${authed ? 'w-full' : 'max-w-5xl'} mx-auto px-4 h-full`}>
        <nav className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <Link to={authed ? "/dashboard" : "/"} className="flex items-center">
              <img
                src="/lovable-uploads/3178870e-8a32-4f12-803b-900aae260b5c.png"
                alt="Content AI"
                className="h-8 w-auto"
              />
            </Link>
          </div>
          <div className="flex-1 flex items-center justify-center space-x-6">
          </div>
          <div className="flex items-center space-x-6">
            {authed ? (
              <>
                <Button 
                  variant="ghost" 
                  className="text-gray-700 gap-1 hover:text-gray-900 hover:bg-gray-100 px-2"
                  onClick={() => navigate('/dashboard/settings?tab=account')}
                >
                  <User size={18} />
                  Account
                </Button>
                <Button
                  variant="ghost"
                  className="text-gray-700 gap-1 hover:text-gray-900 hover:bg-gray-100 px-2"
                  onClick={handleSignOut}
                >
                  <LogOut size={18} />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link 
                  to="/pricing" 
                  className="text-black text-sm font-medium hover:text-black"
                >
                  Pricing
                </Link>
                <span 
                  className="text-black text-sm font-medium cursor-pointer hover:text-black"
                  onClick={() => navigate('/signin')}
                >
                  Login
                </span>
                <span 
                  className="text-sm font-medium px-5 py-2.5 rounded cursor-pointer inline-flex items-center"
                  style={{ backgroundColor: '#e84848', color: 'white' }}
                  onClick={() => navigate('/signup')}
                >
                  Sign Up <ArrowRight className="ml-2 w-4 h-4" />
                </span>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
