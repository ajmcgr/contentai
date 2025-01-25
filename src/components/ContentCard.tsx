import { Calendar, Image, MessageSquare, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContentCardProps {
  type: "text" | "image" | "video";
  platforms: string[];
  scheduledFor: Date;
  content: string;
  imageUrl?: string;
}

export const ContentCard = ({ 
  type, 
  platforms, 
  scheduledFor, 
  content,
  imageUrl 
}: ContentCardProps) => {
  const getTypeIcon = () => {
    switch (type) {
      case "text":
        return <MessageSquare className="h-5 w-5" />;
      case "image":
        return <Image className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    return `/icons/${platform}.svg`;
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="p-2 bg-primary-100 rounded-full text-primary">
            {getTypeIcon()}
          </span>
          <div className="flex space-x-1">
            {platforms.map((platform) => (
              <TooltipProvider key={platform}>
                <Tooltip>
                  <TooltipTrigger>
                    <img 
                      src={getPlatformIcon(platform)} 
                      alt={platform} 
                      className="w-6 h-6"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="capitalize">{platform}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="h-4 w-4 mr-1" />
          {format(scheduledFor, "MMM d, h:mm a")}
        </div>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-gray-600">{content}</p>
        {imageUrl && (
          <img 
            src={imageUrl} 
            alt="Content preview" 
            className="w-full h-32 object-cover rounded-md"
          />
        )}
      </div>
    </Card>
  );
};