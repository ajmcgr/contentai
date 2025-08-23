
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { User, LogOut, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  isAuthenticated?: boolean;
}

export const Header = ({ isAuthenticated }: HeaderProps) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center">
            <img
              src="/lovable-uploads/26bbcb78-84ac-46a3-9fed-739eebd05c90.png"
              alt="Content AI"
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex-1 flex items-center justify-center space-x-6">
            {isAuthenticated ? (
              <>
              </>
            ) : (
              <>
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {!isAuthenticated && (
              <Link 
                to="/pricing" 
                className="text-white transition-opacity text-sm"
              >
                Pricing
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10 transition-colors gap-2"
                  onClick={() => navigate('/dashboard/account')}
                >
                  <User size={18} />
                  Account
                </Button>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/10 transition-colors gap-2"
                  onClick={handleSignOut}
                >
                  <LogOut size={18} />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className="text-white transition-colors text-sm font-normal"
                  onClick={() => navigate('/signin')}
                >
                  Login
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-white text-primary text-sm font-normal"
                  onClick={() => navigate('/signup')}
                >
                  Sign Up <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
