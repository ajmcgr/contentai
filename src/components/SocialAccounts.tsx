
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Twitter, Youtube, Instagram, Linkedin, Facebook } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SocialAccount {
  id: string;
  name: string;
  icon: React.ComponentType;
  connected: boolean;
}

export const SocialAccounts = () => {
  const [accounts, setAccounts] = useState<SocialAccount[]>([
    { id: 'twitter', name: 'X (Twitter)', icon: Twitter, connected: false },
    { id: 'instagram', name: 'Instagram', icon: Instagram, connected: false },
    { id: 'youtube', name: 'YouTube', icon: Youtube, connected: false },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, connected: false },
    { id: 'facebook', name: 'Facebook', icon: Facebook, connected: false },
  ]);

  const handleConnect = async (accountId: string) => {
    // To be implemented with actual OAuth flow
    toast.info("This feature will be implemented in the next step");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Social Accounts</h1>
      <div className="grid gap-6">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="h-6 w-6">
                  <account.icon />
                </span>
                {account.name}
              </CardTitle>
              <CardDescription>
                {account.connected
                  ? "Connected and ready to post"
                  : "Connect your account to start posting"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant={account.connected ? "outline" : "default"}
                onClick={() => handleConnect(account.id)}
              >
                {account.connected ? "Disconnect" : "Connect Account"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
