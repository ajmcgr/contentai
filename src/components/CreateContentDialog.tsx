import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Image, MessageSquare, Video } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CreateContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateContentDialog = ({ 
  open, 
  onOpenChange 
}: CreateContentDialogProps) => {
  const [date, setDate] = useState<Date>();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [contentType, setContentType] = useState<"text" | "image" | "video">("text");

  const platforms = [
    "instagram",
    "facebook",
    "twitter",
    "linkedin",
    "tiktok"
  ];

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Content Type</Label>
            <div className="flex space-x-2">
              <Button
                variant={contentType === "text" ? "default" : "outline"}
                onClick={() => setContentType("text")}
                className="flex-1"
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Text
              </Button>
              <Button
                variant={contentType === "image" ? "default" : "outline"}
                onClick={() => setContentType("image")}
                className="flex-1"
              >
                <Image className="mr-2 h-4 w-4" /> Image
              </Button>
              <Button
                variant={contentType === "video" ? "default" : "outline"}
                onClick={() => setContentType("video")}
                className="flex-1"
              >
                <Video className="mr-2 h-4 w-4" /> Video
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {platforms.map((platform) => (
                <Button
                  key={platform}
                  variant={selectedPlatforms.includes(platform) ? "default" : "outline"}
                  onClick={() => togglePlatform(platform)}
                  className="capitalize"
                >
                  <img 
                    src={`/icons/${platform}.svg`} 
                    alt={platform} 
                    className="w-4 h-4 mr-2"
                  />
                  {platform}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea 
              placeholder="Write your content here..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Schedule For</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Schedule Content
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};