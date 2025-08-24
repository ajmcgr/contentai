import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialBanner } from "@/components/TrialBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, Globe, Clock, Key, Trash2 } from "lucide-react";

export default function Settings() {
  const [brandSettings, setBrandSettings] = useState({
    logo: null as File | null,
    brandName: "",
    description: "",
    targetAudience: "",
    language: "en-US",
    toneOfVoice: "",
    industry: "",
    tags: "",
    internalLinks: ""
  });

  const [contentSettings, setContentSettings] = useState({
    useBrandInfo: true,
    articleLength: "medium",
    brandMentions: "minimal",
    internalLinksCount: "regular",
    externalSearch: true,
    externalLinks: "regular",
    language: "en-US",
    specificInstructions: "",
    exclusions: "",
    imageStyle: ""
  });

  const [accountSettings, setAccountSettings] = useState({
    profilePicture: null as File | null,
    email: "alex@alexmacgregor.com",
    firstName: "Alexander",
    lastName: "MacGregor",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [publishingSettings, setPublishingSettings] = useState({
    scheduledTime: "18:30",
    timezone: "UTC"
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBrandSettings(prev => ({ ...prev, logo: file }));
    }
  };

  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAccountSettings(prev => ({ ...prev, profilePicture: file }));
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col ml-64 sidebar-collapsed:ml-14">
          <div className="flex items-center gap-4 p-6">
            <span className="text-sm text-muted-foreground">
              Dashboard / Settings
            </span>
          </div>

          <div className="flex-1 p-6">
            <TrialBanner />
            
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-8">Settings</h1>
              
              <Tabs defaultValue="brand" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="brand">Brand</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="integrations">Integrations</TabsTrigger>
                  <TabsTrigger value="publishing">Publishing</TabsTrigger>
                </TabsList>

                <TabsContent value="brand" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Brand Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="logo">Upload Logo</Label>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center">
                            {brandSettings.logo ? (
                              <img 
                                src={URL.createObjectURL(brandSettings.logo)} 
                                alt="Logo" 
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Upload className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                          <Input
                            id="logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="max-w-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="brandName">Brand Name (used by customers)</Label>
                          <Input
                            id="brandName"
                            value={brandSettings.brandName}
                            onChange={(e) => setBrandSettings(prev => ({ ...prev, brandName: e.target.value }))}
                            placeholder="Enter your brand name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="industry">Industry</Label>
                          <Input
                            id="industry"
                            value={brandSettings.industry}
                            onChange={(e) => setBrandSettings(prev => ({ ...prev, industry: e.target.value }))}
                            placeholder="e.g., Technology, Healthcare"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={brandSettings.description}
                          onChange={(e) => setBrandSettings(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe your brand and what it does"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="targetAudience">Target Audience</Label>
                        <Textarea
                          id="targetAudience"
                          value={brandSettings.targetAudience}
                          onChange={(e) => setBrandSettings(prev => ({ ...prev, targetAudience: e.target.value }))}
                          placeholder="Describe your target audience"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Language by default</Label>
                          <Select value={brandSettings.language} onValueChange={(value) => setBrandSettings(prev => ({ ...prev, language: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en-US">🇺🇸 English (United States)</SelectItem>
                              <SelectItem value="en-GB">🇬🇧 English (United Kingdom)</SelectItem>
                              <SelectItem value="es-ES">🇪🇸 Spanish (Spain)</SelectItem>
                              <SelectItem value="fr-FR">🇫🇷 French (France)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="toneOfVoice">Tone of voice</Label>
                          <Input
                            id="toneOfVoice"
                            value={brandSettings.toneOfVoice}
                            onChange={(e) => setBrandSettings(prev => ({ ...prev, toneOfVoice: e.target.value }))}
                            placeholder="e.g., Professional, Friendly, Casual"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                          id="tags"
                          value={brandSettings.tags}
                          onChange={(e) => setBrandSettings(prev => ({ ...prev, tags: e.target.value }))}
                          placeholder="Enter tags separated by commas"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="internalLinks">Internal links</Label>
                        <Textarea
                          id="internalLinks"
                          value={brandSettings.internalLinks}
                          onChange={(e) => setBrandSettings(prev => ({ ...prev, internalLinks: e.target.value }))}
                          placeholder="Add important internal links (one per line)"
                          rows={3}
                        />
                      </div>

                      <Button>Save Brand Settings</Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="content" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Content Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Use brand info</Label>
                            <p className="text-sm text-muted-foreground">
                              When selected, Blogbuster uses both the topic brief and your brand info (description, activity, audience, internal links) to tailor the article. If not, only the brief is used.
                            </p>
                          </div>
                          <Switch
                            checked={contentSettings.useBrandInfo}
                            onCheckedChange={(checked) => setContentSettings(prev => ({ ...prev, useBrandInfo: checked }))}
                          />
                        </div>
                        <div className="text-sm">
                          {contentSettings.useBrandInfo ? (
                            <span className="text-green-600">Using brand info</span>
                          ) : (
                            <span className="text-muted-foreground">Not using brand info</span>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <Label>Article Length Target</Label>
                        <p className="text-sm text-muted-foreground">Set the word count of your articles.</p>
                        <RadioGroup
                          value={contentSettings.articleLength}
                          onValueChange={(value) => setContentSettings(prev => ({ ...prev, articleLength: value }))}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="short" id="short" />
                            <Label htmlFor="short">Short (800 - 1,200 words)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="medium" id="medium" />
                            <Label htmlFor="medium">Medium (1,200 - 1,600 words)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="long" id="long" />
                            <Label htmlFor="long">Long (1,600 - 2,000 words)</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-3">
                        <Label>Brand mentions</Label>
                        <p className="text-sm text-muted-foreground">How often mentions to your brand/product should appear in the content.</p>
                        <RadioGroup
                          value={contentSettings.brandMentions}
                          onValueChange={(value) => setContentSettings(prev => ({ ...prev, brandMentions: value }))}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="none" id="mentions-none" />
                            <Label htmlFor="mentions-none">None</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="minimal" id="mentions-minimal" />
                            <Label htmlFor="mentions-minimal">Minimal</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="regular" id="mentions-regular" />
                            <Label htmlFor="mentions-regular">Regular</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="maximal" id="mentions-maximal" />
                            <Label htmlFor="mentions-maximal">Maximal</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-3">
                        <Label>Internal Links</Label>
                        <p className="text-sm text-muted-foreground">Number of links to other pages of your website to include.</p>
                        <RadioGroup
                          value={contentSettings.internalLinksCount}
                          onValueChange={(value) => setContentSettings(prev => ({ ...prev, internalLinksCount: value }))}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="none" id="internal-none" />
                            <Label htmlFor="internal-none">None</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="few" id="internal-few" />
                            <Label htmlFor="internal-few">Few (1-2)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="regular" id="internal-regular" />
                            <Label htmlFor="internal-regular">Regular (3-4)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="many" id="internal-many" />
                            <Label htmlFor="internal-many">Many (over 5)</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>External Search</Label>
                            <p className="text-sm text-muted-foreground">
                              Auto-search for latest news, data, reports related to your topic.
                            </p>
                          </div>
                          <Switch
                            checked={contentSettings.externalSearch}
                            onCheckedChange={(checked) => setContentSettings(prev => ({ ...prev, externalSearch: checked }))}
                          />
                        </div>
                        <div className="text-sm">
                          <span className={contentSettings.externalSearch ? "text-green-600" : "text-muted-foreground"}>
                            {contentSettings.externalSearch ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>External Links</Label>
                        <p className="text-sm text-muted-foreground">Number of links to external references related to your topics (media, research, blogs).</p>
                        <RadioGroup
                          value={contentSettings.externalLinks}
                          onValueChange={(value) => setContentSettings(prev => ({ ...prev, externalLinks: value }))}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="none" id="external-none" />
                            <Label htmlFor="external-none">None</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="few" id="external-few" />
                            <Label htmlFor="external-few">Few (1-2)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="regular" id="external-regular" />
                            <Label htmlFor="external-regular">Regular (3-4)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="many" id="external-many" />
                            <Label htmlFor="external-many">Many (over 5)</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label>Language by default</Label>
                        <p className="text-sm text-muted-foreground">The default targeted language and market for your articles.</p>
                        <Select value={contentSettings.language || "en-US"} onValueChange={(value) => setContentSettings(prev => ({ ...prev, language: value }))}>
                          <SelectTrigger className="max-w-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en-US">🇺🇸 English (United States)</SelectItem>
                            <SelectItem value="en-GB">🇬🇧 English (United Kingdom)</SelectItem>
                            <SelectItem value="es-ES">🇪🇸 Spanish (Spain)</SelectItem>
                            <SelectItem value="fr-FR">🇫🇷 French (France)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specificInstructions">Specific Instructions</Label>
                        <p className="text-sm text-muted-foreground">Additional rules the articles will follow.</p>
                        <Textarea
                          id="specificInstructions"
                          value={contentSettings.specificInstructions}
                          onChange={(e) => setContentSettings(prev => ({ ...prev, specificInstructions: e.target.value }))}
                          placeholder="e.g., Be super friendly"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="exclusions">Exclusions</Label>
                        <p className="text-sm text-muted-foreground">Elements to avoid in the articles.</p>
                        <Textarea
                          id="exclusions"
                          value={contentSettings.exclusions}
                          onChange={(e) => setContentSettings(prev => ({ ...prev, exclusions: e.target.value }))}
                          placeholder="e.g., Never mention this or this"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="imageStyle">Image Style</Label>
                        <p className="text-sm text-muted-foreground">Visuals style of images generated within the articles.</p>
                        <Input
                          id="imageStyle"
                          value={contentSettings.imageStyle}
                          onChange={(e) => setContentSettings(prev => ({ ...prev, imageStyle: e.target.value }))}
                          placeholder="e.g., Modern, Professional, Minimalist"
                        />
                      </div>

                      <Button>Save Content Settings</Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="account" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="profilePicture">Profile Picture</Label>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-full flex items-center justify-center overflow-hidden">
                            {accountSettings.profilePicture ? (
                              <img 
                                src={URL.createObjectURL(accountSettings.profilePicture)} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Upload className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                          <Input
                            id="profilePicture"
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureUpload}
                            className="max-w-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Manage your account settings</h3>
                        
                        <div className="p-4 border rounded-lg space-y-2">
                          <p className="text-sm font-medium">Preview</p>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <span className="text-sm">Google account</span>
                          </div>
                          <p className="text-xs text-muted-foreground">google</p>
                          <Button variant="outline" size="sm">Link Google Account</Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              value={accountSettings.email}
                              onChange={(e) => setAccountSettings(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </div>
                          <div></div>
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First name</Label>
                            <Input
                              id="firstName"
                              value={accountSettings.firstName}
                              onChange={(e) => setAccountSettings(prev => ({ ...prev, firstName: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last name</Label>
                            <Input
                              id="lastName"
                              value={accountSettings.lastName}
                              onChange={(e) => setAccountSettings(prev => ({ ...prev, lastName: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <Button variant="outline">Log Out</Button>
                          <Button variant="destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete account
                          </Button>
                          <Button variant="outline">Manage subscription</Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Password</h3>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <p className="text-sm text-muted-foreground">Reinforce account security</p>
                            <Input
                              id="currentPassword"
                              type="password"
                              value={accountSettings.currentPassword}
                              onChange={(e) => setAccountSettings(prev => ({ ...prev, currentPassword: e.target.value }))}
                              placeholder="Enter current password"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={accountSettings.newPassword}
                              onChange={(e) => setAccountSettings(prev => ({ ...prev, newPassword: e.target.value }))}
                              placeholder="Enter new password"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={accountSettings.confirmPassword}
                              onChange={(e) => setAccountSettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              placeholder="Confirm new password"
                            />
                          </div>

                          <Button>Update Password</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="integrations" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Integrations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Connections</h3>
                        <p className="text-muted-foreground">Connect to your favorite CMS and auto-publish your SEO blogs</p>
                        
                        <div className="grid gap-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                                W
                              </div>
                              <div>
                                <h4 className="font-medium">Wordpress</h4>
                                <p className="text-sm text-muted-foreground">
                                  Publish your blogs directly to your WordPress site. No plugins or coding required.
                                </p>
                              </div>
                            </div>
                            <Button variant="outline">Connect</Button>
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-600 rounded flex items-center justify-center text-white font-bold">
                                S
                              </div>
                              <div>
                                <h4 className="font-medium">Shopify</h4>
                                <p className="text-sm text-muted-foreground">
                                  Add a blog to your Shopify store and boost your SEO with ease.
                                </p>
                              </div>
                            </div>
                            <Button variant="outline">Connect</Button>
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center text-white font-bold">
                                W
                              </div>
                              <div>
                                <h4 className="font-medium">Webflow</h4>
                                <p className="text-sm text-muted-foreground">
                                  Integrate Blogbuster with Webflow to publish blogs.
                                </p>
                              </div>
                            </div>
                            <Button variant="outline">Connect</Button>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Developer API</h3>
                        <p className="text-muted-foreground">Connect with your custom website. Check our docs.</p>
                        
                        <div className="space-y-2">
                          <Label htmlFor="apiKey">Your API Key</Label>
                          <div className="flex gap-2">
                            <Input
                              id="apiKey"
                              value="••••••••••••••••••••••••••••••••"
                              readOnly
                              className="font-mono"
                            />
                            <Button variant="outline">
                              <Key className="w-4 h-4 mr-2" />
                              Generate
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="publishing" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Publishing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Scheduler</h3>
                        <p className="text-muted-foreground">Choose the date and time to schedule</p>
                        
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <Button>Save</Button>
                          </div>

                          <div className="space-y-2">
                            <Label>Times</Label>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <Input
                                type="time"
                                value={publishingSettings.scheduledTime}
                                onChange={(e) => setPublishingSettings(prev => ({ ...prev, scheduledTime: e.target.value }))}
                                className="max-w-xs"
                              />
                            </div>
                            <Button variant="outline" size="sm">Add new daily time</Button>
                          </div>

                          <div className="space-y-2">
                            <Label>Select timezone</Label>
                            <Select value={publishingSettings.timezone} onValueChange={(value) => setPublishingSettings(prev => ({ ...prev, timezone: value }))}>
                              <SelectTrigger className="max-w-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UTC">GMT+00:00 (UTC)</SelectItem>
                                <SelectItem value="EST">GMT-05:00 (EST)</SelectItem>
                                <SelectItem value="PST">GMT-08:00 (PST)</SelectItem>
                                <SelectItem value="CET">GMT+01:00 (CET)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
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