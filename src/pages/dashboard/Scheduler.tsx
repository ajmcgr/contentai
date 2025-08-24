import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialBanner } from "@/components/TrialBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Scheduler() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col ml-64 sidebar-collapsed:ml-14">
          <div className="flex items-center gap-4 p-6">
            <span className="text-sm text-muted-foreground">
              Dashboard / Scheduler
            </span>
          </div>

          <div className="flex-1 p-6">
            <TrialBanner />
            
            <Card>
              <CardHeader>
                <CardTitle>Content Scheduler</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Schedule your content publishing here.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}