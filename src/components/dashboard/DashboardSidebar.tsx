import { FileText, Calendar, Link, Settings, CreditCard, PenTool, Tags, Star } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

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
  const currentPath = location.pathname;

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

        {/* Upgrade Plan */}
        <div className="mt-auto p-4 border-t border-border">
          <SidebarMenuButton asChild className="h-12">
            <button 
              onClick={() => {
                window.open('https://buy.stripe.com/14AaEZ2Bd06k6KXbCYeAg00', '_blank');
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors"
            >
              <Star className="h-5 w-5" />
              {!isCollapsed && <span className="ml-3">Upgrade Plan</span>}
            </button>
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}