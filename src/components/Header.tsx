
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { User, LogOut, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  isAuthenticated?: boolean;
}

export const Header = ({ isAuthenticated }: HeaderProps) => {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean>(!!isAuthenticated);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) setAuthed(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setAuthed(!!session);
    });
    return () => {
      subscription.unsubscribe();
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  return (
    <header className={authed ? "bg-white border-b w-full" : "bg-primary w-full"}>
      <div className="max-w-5xl mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link to={authed ? "/dashboard" : "/"} className="flex items-center">
            <img
              src={authed ? "/lovable-uploads/1d735d91-3727-4142-b011-ec4dce9aa294.png" : "/lovable-uploads/26bbcb78-84ac-46a3-9fed-739eebd05c90.png"}
              alt="Content AI"
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex-1 flex items-center justify-center space-x-6">
          </div>
          <div className="flex items-center space-x-4">
            {authed ? (
              <>
                <Button 
                  variant="ghost" 
                  className="text-gray-700 gap-2 hover:text-gray-900 hover:bg-gray-100"
                  onClick={() => navigate('/dashboard/account')}
                >
                  <User size={18} />
                  Account
                </Button>
                <Button
                  variant="ghost"
                  className="text-gray-700 gap-2 hover:text-gray-900 hover:bg-gray-100"
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
                  className="text-white text-sm font-medium no-hover"
                >
                  Pricing
                </Link>
                <span 
                  className="text-white text-sm font-medium cursor-pointer hover:text-white"
                  onClick={() => navigate('/signin')}
                >
                  Login
                </span>
                <span 
                  className="bg-white text-sm font-medium px-4 py-2 rounded cursor-pointer inline-flex items-center"
                  style={{ color: '#222529' }}
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
