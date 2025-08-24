import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialBanner } from "@/components/TrialBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";

export default function Scheduler() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Generate dates for the next 90 days
  const generateScheduleDates = () => {
    const dates = [];
    const today = new Date(2025, 7, 24); // Aug 24, 2025 as shown in the example
    
    for (let i = 0; i < 90; i++) {
      const date = addDays(today, i);
      dates.push({
        date,
        time: "6:30 PM",
        hasContent: false,
        isToday: i === 0,
        isTomorrow: i === 1
      });
    }
    return dates;
  };

  const scheduleDates = generateScheduleDates();

  const formatDateLabel = (date: Date, isToday: boolean, isTomorrow: boolean) => {
    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    return format(date, "dd MMM yyyy");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-4 p-6">
            <span className="text-sm text-muted-foreground">
              Dashboard / Scheduler
            </span>
          </div>

          <div className="flex-1 p-6">
            <TrialBanner />
            
            <div className="max-w-6xl mx-auto space-y-6">
              <h1 className="text-3xl font-bold">Scheduler</h1>
              
              <Tabs defaultValue="coming" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="coming" className="flex items-center gap-2">
                    Scheduled Coming <Badge variant="secondary">0</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="past" className="flex items-center gap-2">
                    Scheduled Past <Badge variant="secondary">0</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="coming" className="space-y-4">
                  <div className="grid gap-3 max-h-[70vh] overflow-y-auto pr-2">
                    {scheduleDates.map((scheduleItem, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {formatDateLabel(scheduleItem.date, scheduleItem.isToday, scheduleItem.isTomorrow)}
                                  {(scheduleItem.isToday || scheduleItem.isTomorrow) && (
                                    <span className="text-muted-foreground ml-1">
                                      | {format(scheduleItem.date, "dd MMM yyyy")}
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {scheduleItem.time}
                                </span>
                              </div>
                            </div>
                            
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              Choose from topics
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="past" className="space-y-4">
                  <Card className="p-8 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Calendar className="w-12 h-12 text-muted-foreground" />
                      <div>
                        <h3 className="text-lg font-medium">No past scheduled content</h3>
                        <p className="text-muted-foreground">
                          Once you have published scheduled content, it will appear here.
                        </p>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}