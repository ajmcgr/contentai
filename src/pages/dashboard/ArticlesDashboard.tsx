import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ArticleManagement } from "@/components/dashboard/ArticleManagement";
import { TrialBanner } from "@/components/TrialBanner";

export default function ArticlesDashboard() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background pt-20">
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
          <div className="flex-1 p-6">
            <TrialBanner />
            <ArticleManagement />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}