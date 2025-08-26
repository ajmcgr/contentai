export const PlatformsSection = () => {
  const platforms = [
    {
      name: "WordPress",
      logo: "/lovable-uploads/d8fa0a46-f1a4-4e86-a9fa-f2102a039436.png",
      description: "Seamlessly publish to your WordPress blog"
    },
    {
      name: "Shopify", 
      logo: "/lovable-uploads/93b6287a-d091-4ee7-b4ae-e45ea7a3e122.png",
      description: "Create content for your Shopify store blog"
    },
    {
      name: "Webflow",
      logo: "/lovable-uploads/dea3f4ce-82f3-48a3-af08-5c64d570b629.png", 
      description: "Publish directly to your Webflow CMS"
    },
    {
      name: "Wix",
      logo: "/lovable-uploads/4a03d01f-8a2e-4efb-9cbc-a7fd87e0ce20.png",
      description: "Publish blogs directly to your Wix site"
    },
    {
      name: "Notion",
      logo: "/lovable-uploads/3668248b-f746-4b84-85a3-9a25cf2a937e.png",
      description: "Create pages in your Notion database"
    },
    {
      name: "Ghost",
      logo: "/lovable-uploads/af07b7e4-6f3c-4202-8e50-f810cca951bc.png",
      description: "Publish to your Ghost blog platform"
    },
    {
      name: "Squarespace",
      logo: "/lovable-uploads/94e1830f-eb6c-4c1d-aa6e-42152232cf2f.png",
      description: "Publish blog posts to your Squarespace website"
    },
    {
      name: "Zapier",
      logo: "/lovable-uploads/28858514-61f5-43b3-8eec-762b7b23c1b7.png",
      description: "Automate publishing to 5000+ apps"
    }
  ];

  return (
    <section className="py-16 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-reckless font-medium text-foreground mb-4">
            Publish to Your Favorite Platform
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect and publish your AI-generated content directly to the platforms you already use
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {platforms.map((platform, index) => (
            <div 
              key={index}
              className="rounded-xl p-8 text-center"
            >
              <div className="mb-6 flex justify-center">
                <img 
                  src={platform.logo} 
                  alt={`${platform.name} logo`}
                  className="h-16 w-auto object-contain"
                />
              </div>
              <h3 className="text-lg mb-2">{platform.name}</h3>
              <p className="text-sm text-muted-foreground">{platform.description}</p>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            More integrations coming soon including Framer and custom APIs
          </p>
        </div>
      </div>
    </section>
  );
};