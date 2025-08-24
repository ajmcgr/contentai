
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { User, LogOut, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface HeaderProps {
  isAuthenticated?: boolean;
}

export const Header = ({ isAuthenticated }: HeaderProps) => {
  const navigate = useNavigate();
  const { user } = useSubscription();
  const authed = !!user;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  return (
    <header className="bg-white border-b w-full h-16">
      <div className="max-w-5xl mx-auto px-4 h-full">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
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
          <div className="flex items-center space-x-2">
            {authed ? (
              <>
                <Button 
                  variant="ghost" 
                  className="text-gray-700 gap-1 hover:text-gray-900 hover:bg-gray-100 px-2"
                  onClick={() => navigate('/dashboard/account')}
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
                  className="text-black text-sm font-medium no-hover"
                >
                  Pricing
                </Link>
                <span 
                  className="text-black text-sm font-medium cursor-pointer hover:text-gray-600"
                  onClick={() => navigate('/signin')}
                >
                  Login
                </span>
                <span 
                  className="text-sm font-medium px-4 py-2 rounded cursor-pointer inline-flex items-center"
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
