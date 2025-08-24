import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialBanner } from "@/components/TrialBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Write() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col ml-64 sidebar-collapsed:ml-14">
          <div className="flex items-center gap-4 p-6">
            <span className="text-sm text-muted-foreground">
              Dashboard / Write
            </span>
          </div>

          <div className="flex-1 p-6">
            <TrialBanner />
            
            <Card>
              <CardHeader>
                <CardTitle>Write New Article</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input placeholder="Enter article title..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea 
                    placeholder="Start writing your article..." 
                    className="min-h-[300px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button>Save Draft</Button>
                  <Button variant="outline">Preview</Button>
                  <Button variant="secondary">Publish</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}