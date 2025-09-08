import { FileText, Calendar, Link, Settings, CreditCard, PenTool, Tags, Star } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Write", url: "/dashboard/write", icon: PenTool },
  { title: "Article", url: "/dashboard", icon: FileText },
  { title: "Topics", url: "/dashboard/topics", icon: Tags },
  { title: "Scheduler", url: "/dashboard/scheduler", icon: Calendar },
  { title: "Backlinks", url: "/dashboard/backlinks", icon: Link },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { subscribed, planType, user } = useSubscription();
  const { toast } = useToast();
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);
  const currentPath = location.pathname;

  const handleSubscriptionAction = async () => {
    if (!user) {
      toast({ title: 'Please sign in', description: 'You need to be signed in to manage your subscription.' });
      window.location.href = '/signin';
      return;
    }
    if (subscribed && planType === 'pro') {
      try {
        setIsCreatingPortal(true);
        const { data, error } = await supabase.functions.invoke('customer-portal');
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank');
        } else {
          throw new Error('No portal URL received');
        }
      } catch (error) {
        console.error('Error creating customer portal:', error);
        toast({ title: 'Error', description: 'Failed to open subscription management. Please try again.', variant: 'destructive' });
      } finally {
        setIsCreatingPortal(false);
      }
    } else {
      window.open('https://buy.stripe.com/14AaEZ2Bd06k6KXbCYeAg00', '_blank');
    }
  };

  const isActive = (path: string) => {
    if (path === "/dashboard" && currentPath === "/dashboard") return true;
    if (path !== "/dashboard" && currentPath.startsWith(path)) return true;
    return false;
  };

  const getNavCls = (path: string) =>
    isActive(path) 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      className="border-r border-border"
      collapsible="icon"
    >
      <SidebarContent className="bg-background">
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12">
                    <NavLink to={item.url} className={getNavCls(item.url)}>
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Subscription Action */}
        <div className="mt-auto p-4 border-t border-border">
          <SidebarMenuButton asChild className="h-12">
            <button 
              onClick={handleSubscriptionAction}
              disabled={isCreatingPortal}
              className={`font-medium w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors disabled:opacity-50 ${
                subscribed && planType === 'pro' 
                  ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              <Star className="h-5 w-5" />
              {!isCollapsed && (
                <span className="ml-3">
                  {isCreatingPortal ? 'Loading...' : (subscribed && planType === 'pro' ? 'Manage Plan' : 'Upgrade Plan')}
                </span>
              )}
            </button>
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}