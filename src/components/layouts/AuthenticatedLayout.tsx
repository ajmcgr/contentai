
import { useState, useEffect } from "react";
import { Navigate, Outlet, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { Footer } from "../Footer";

export const AuthenticatedLayout = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return null;
  }

  if (!session) {
    return <Navigate to="/signin" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard">
            <img
              src="/lovable-uploads/26bbcb78-84ac-46a3-9fed-739eebd05c90.png"
              alt="Content AI"
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/account">
                <User className="mr-2 h-4 w-4" />
                Account
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-background">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
