import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard } from "./ContentCard";
import { CreateContentDialog } from "./CreateContentDialog";
import { useState } from "react";

export const Dashboard = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">Content AI</h1>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-primary hover:bg-primary-600 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Content
          </Button>
        </div>

        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary-700 animate-fade-in">
            Post content at your leisure
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Scheduled Posts</h3>
            <p className="text-3xl font-bold text-primary">12</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Platforms Connected</h3>
            <p className="text-3xl font-bold text-primary">5</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Posts This Month</h3>
            <p className="text-3xl font-bold text-primary">48</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-xl font-semibold">Upcoming Content</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ContentCard 
              type="text"
              platforms={["twitter", "linkedin"]}
              scheduledFor={new Date(Date.now() + 86400000)}
              content="Excited to announce our new AI-powered content scheduling features! #ContentAI #SocialMedia"
            />
            <ContentCard 
              type="image"
              platforms={["instagram", "facebook"]}
              scheduledFor={new Date(Date.now() + 172800000)}
              content="Check out our latest product update!"
              imageUrl="/placeholder.svg"
            />
            <ContentCard 
              type="video"
              platforms={["tiktok"]}
              scheduledFor={new Date(Date.now() + 259200000)}
              content="How to schedule your social media content effectively"
            />
          </div>
        </div>
      </div>
      <CreateContentDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
};