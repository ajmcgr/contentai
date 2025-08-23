export const PlatformsSection = () => {
  const platforms = [
    {
      name: "WordPress",
      logo: "/lovable-uploads/6dd255c2-8a17-4484-896a-eb032dc2e7ec.png",
      description: "Seamlessly publish to your WordPress blog"
    },
    {
      name: "Shopify", 
      logo: "/lovable-uploads/5643a3ef-6962-4c2f-b99f-4314df6ed5ee.png",
      description: "Create content for your Shopify store blog"
    },
    {
      name: "Webflow",
      logo: "/lovable-uploads/2dba3e23-9055-4a36-902c-26ec9ea8f668.png", 
      description: "Publish directly to your Webflow CMS"
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Publish to Your Favorite Platform
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect and publish your AI-generated content directly to the platforms you already use
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {platforms.map((platform, index) => (
            <div 
              key={index}
              className="bg-card border border-border rounded-xl p-8 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="mb-6 flex justify-center">
                <img 
                  src={platform.logo} 
                  alt={`${platform.name} logo`}
                  className="h-16 w-auto object-contain"
                />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {platform.name}
              </h3>
              <p className="text-muted-foreground">
                {platform.description}
              </p>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            More integrations coming soon including Framer, Notion, Wix, and custom APIs
          </p>
        </div>
      </div>
    </section>
  );
};