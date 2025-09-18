
import { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "../Footer";

export const AuthenticatedLayout = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    // Set up auth state listener FIRST to catch auth events during initialization
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  if (loading) {
    return null; // keep UI minimal during auth check
  }

  if (!session) {
    return <Navigate to="/signin" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      
      <main className="flex-1 bg-background">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
