import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface LoadingDialogProps {
  open: boolean;
  title?: string;
  description?: string;
}

export function LoadingDialog({ open, title = "Working on it...", description = "This usually takes a few seconds." }: LoadingDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md border bg-background animate-enter">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-full p-3 bg-primary/10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
