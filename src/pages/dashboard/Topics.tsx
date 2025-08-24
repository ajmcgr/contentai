import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialBanner } from "@/components/TrialBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Topics() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col ml-64 sidebar-collapsed:ml-14">
          <div className="flex items-center gap-4 p-6">
            <span className="text-sm text-muted-foreground">
              Dashboard / Topics
            </span>
          </div>

          <div className="flex-1 p-6">
            <TrialBanner />
            
            <Card>
              <CardHeader>
                <CardTitle>Content Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Manage and organize your content topics here.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}