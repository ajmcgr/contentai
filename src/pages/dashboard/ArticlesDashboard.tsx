import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ArticleManagement } from "@/components/dashboard/ArticleManagement";

export default function ArticlesDashboard() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 flex items-center justify-between border-b border-border px-6">
            <SidebarTrigger className="lg:hidden" />
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Dashboard / Articles
              </span>
            </div>
          </header>

          {/* Main Content */}
          <ArticleManagement />
        </div>
      </div>
    </SidebarProvider>
  );
}