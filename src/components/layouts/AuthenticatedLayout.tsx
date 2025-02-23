
import { useState, useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, History } from "lucide-react";
import { Link } from "react-router-dom";

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

  if (loading) {
    return null;
  }

  if (!session) {
    return <Navigate to="/signin" />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarHeader className="p-4">
            <Link to="/">
              <img
                src="/lovable-uploads/26bbcb78-84ac-46a3-9fed-739eebd05c90.png"
                alt="Content AI"
                className="h-8 w-auto"
              />
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <nav className="space-y-2 px-2">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link to="/dashboard/new">
                  <Plus className="mr-2" />
                  Create New Post
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link to="/dashboard/scheduled">
                  <Calendar className="mr-2" />
                  Scheduled
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link to="/dashboard/posts">
                  <History className="mr-2" />
                  Posts
                </Link>
              </Button>
            </nav>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 min-h-screen bg-gray-50">
          <div className="p-6">
            <SidebarTrigger />
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
