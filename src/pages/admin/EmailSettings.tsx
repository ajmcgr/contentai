import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEmailConfig, useUpdateEmailConfig, useSendTestEmail } from "@/hooks/useEmailConfig";
import { Loader2, Mail, Settings, TestTube2 } from "lucide-react";

export default function EmailSettings() {
  const { data: config, isLoading } = useEmailConfig();
  const updateConfig = useUpdateEmailConfig();
  const sendTestEmail = useSendTestEmail();

  const [formData, setFormData] = useState({
    resend_api_key: "",
    email_from: "support@trycontent.ai",
  });

  const [testEmail, setTestEmail] = useState({
    to: "",
    subject: "Resend sanity check",
    html: "<p>If you get this, config-based send works.</p>",
    text: "If you get this, config-based send works.",
  });

  // Update form data when config loads
  useEffect(() => {
    if (config) {
      setFormData({
        resend_api_key: config.resend_api_key || "",
        email_from: config.email_from || "support@trycontent.ai",
      });
    }
  }, [config]);

  const handleSaveConfig = () => {
    updateConfig.mutate(formData);
  };

  const handleSendTest = () => {
    sendTestEmail.mutate(testEmail);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Email Settings</h1>
      </div>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Configure Resend API settings for sending transactional emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resend_api_key">Resend API Key</Label>
            <Input
              id="resend_api_key"
              type="password"
              placeholder="re_..."
              value={formData.resend_api_key}
              onChange={(e) => setFormData({ ...formData, resend_api_key: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_from">From Email Address</Label>
            <Input
              id="email_from"
              type="email"
              placeholder="support@trycontent.ai"
              value={formData.email_from}
              onChange={(e) => setFormData({ ...formData, email_from: e.target.value })}
            />
          </div>

          <Button 
            onClick={handleSaveConfig} 
            disabled={updateConfig.isPending}
            className="w-full"
          >
            {updateConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Diagnostics Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnostics</CardTitle>
          <CardDescription>Current email configuration status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Environment:</span>
            <Badge variant="outline">Production</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="font-medium">Has API Key:</span>
            <Badge variant={config?.resend_api_key ? "default" : "destructive"}>
              {config?.resend_api_key ? "Yes" : "No"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="font-medium">From Address:</span>
            <Badge variant="outline">
              {config?.email_from || "NOT SET"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">Last Updated:</span>
            <Badge variant="outline">
              {config?.updated_at ? new Date(config.updated_at).toLocaleString() : "Never"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Test Email Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5" />
            Email Test
          </CardTitle>
          <CardDescription>
            Send a test email to verify your configuration is working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test_to">To Email</Label>
            <Input
              id="test_to"
              type="email"
              placeholder="test@example.com"
              value={testEmail.to}
              onChange={(e) => setTestEmail({ ...testEmail, to: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test_subject">Subject</Label>
            <Input
              id="test_subject"
              value={testEmail.subject}
              onChange={(e) => setTestEmail({ ...testEmail, subject: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test_html">HTML Content</Label>
            <Textarea
              id="test_html"
              rows={3}
              value={testEmail.html}
              onChange={(e) => setTestEmail({ ...testEmail, html: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test_text">Text Content</Label>
            <Textarea
              id="test_text"
              rows={2}
              value={testEmail.text}
              onChange={(e) => setTestEmail({ ...testEmail, text: e.target.value })}
            />
          </div>

          <Button 
            onClick={handleSendTest} 
            disabled={sendTestEmail.isPending || !testEmail.to}
            className="w-full"
            variant="outline"
          >
            {sendTestEmail.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Test Email
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}