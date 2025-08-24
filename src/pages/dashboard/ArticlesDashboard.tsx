import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ArticleManagement } from "@/components/dashboard/ArticleManagement";
import { TrialBanner } from "@/components/TrialBanner";

export default function ArticlesDashboard() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-4 p-6">
            <span className="text-sm text-muted-foreground">
              Dashboard / Articles
            </span>
          </div>

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