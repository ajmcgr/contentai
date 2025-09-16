import { Globe, Edit3, Hash, Globe2, Users, Headphones } from "lucide-react";

export const AdditionalFeaturesSection = () => {
  return (
    <div className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-reckless mb-2 text-foreground">Write in your language</h3>
            <p className="text-muted-foreground">Generate high-quality content in over 150+ languages. Our AI creates articles in any language you need.</p>
          </div>
          <div className="text-center p-6">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Edit3 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-reckless mb-2 text-foreground">Edit article with AI</h3>
            <p className="text-muted-foreground">Easily edit your article to meet your exact expectations, ensuring every word aligns with your vision for standout content.</p>
          </div>
          <div className="text-center p-6">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hash className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-reckless mb-2 text-foreground">Generate unlimited keywords</h3>
            <p className="text-muted-foreground">Generate unlimited sets of keywords until you find the perfect match for your content</p>
          </div>
          <div className="text-center p-6">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-reckless mb-2 text-foreground">Multi-site package</h3>
            <p className="text-muted-foreground">Scale your content strategy by adding more websites to your package whenever needed.</p>
          </div>
          <div className="text-center p-6">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-reckless mb-2 text-foreground">Multi-user access</h3>
            <p className="text-muted-foreground">Invite multiple editors to your organization and collaborate seamlessly to generate impactful content together</p>
          </div>
          <div className="text-center p-6">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Headphones className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-reckless mb-2 text-foreground">Support</h3>
            <p className="text-muted-foreground">Get expert assistance 24/7, ensuring smooth operation of all platform features.</p>
          </div>
        </div>
      </div>
    </div>
  );
};