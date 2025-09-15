export const PlatformsSection = () => {
  const featuredPlatforms = [
    {
      name: "WordPress",
      logo: "/lovable-uploads/d8fa0a46-f1a4-4e86-a9fa-f2102a039436.png",
      description: "Seamlessly publish to your WordPress blog",
      featured: true
    },
    {
      name: "Shopify", 
      logo: "/lovable-uploads/93b6287a-d091-4ee7-b4ae-e45ea7a3e122.png",
      description: "Create content for your Shopify store blog",
      featured: true
    },
    {
      name: "Wix",
      logo: "/lovable-uploads/4a03d01f-8a2e-4efb-9cbc-a7fd87e0ce20.png",
      description: "Publish blogs directly to your Wix site",
      featured: true
    }
  ];

  const comingSoonPlatforms = [
    {
      name: "Webflow",
      logo: "/lovable-uploads/dea3f4ce-82f3-48a3-af08-5c64d570b629.png", 
      description: "Publish directly to your Webflow CMS",
      featured: false
    },
    {
      name: "Notion",
      logo: "/lovable-uploads/3668248b-f746-4b84-85a3-9a25cf2a937e.png",
      description: "Create pages in your Notion database",
      featured: false
    },
    {
      name: "Ghost",
      logo: "/lovable-uploads/af07b7e4-6f3c-4202-8e50-f810cca951bc.png",
      description: "Publish to your Ghost blog platform",
      featured: false
    },
    {
      name: "Zapier",
      logo: "/lovable-uploads/28858514-61f5-43b3-8eec-762b7b23c1b7.png",
      description: "Automate publishing to 5000+ apps",
      featured: false
    }
  ];

  return (
    <section className="py-16" style={{ backgroundColor: 'hsl(var(--section-white))' }}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-reckless font-medium text-foreground mb-4">
            Publish to Your Favorite Platform
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect and publish your AI-generated content directly to the platforms you already use
          </p>
        </div>
        
        {/* Featured Platforms */}
        <div className="mb-16">
          <h3 className="text-2xl font-reckless font-medium text-center mb-8 text-foreground">
            Available Now
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {featuredPlatforms.map((platform, index) => (
              <div 
                key={index}
                className="relative rounded-xl p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:scale-105"
              >
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Live
                  </span>
                </div>
                <div className="mb-6 flex justify-center">
                  <img 
                    src={platform.logo} 
                    alt={`${platform.name} logo`}
                    className="h-16 w-auto object-contain"
                  />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">{platform.name}</h3>
                <p className="text-sm text-muted-foreground">{platform.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Coming Soon Platforms */}
        <div>
          <h3 className="text-xl font-reckless font-medium text-center mb-8 text-muted-foreground">
            Coming Soon
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {comingSoonPlatforms.map((platform, index) => (
              <div 
                key={index}
                className="relative rounded-lg p-6 text-center opacity-60 hover:opacity-80 transition-opacity duration-300"
              >
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Soon
                  </span>
                </div>
                <div className="mb-4 flex justify-center">
                  <img 
                    src={platform.logo} 
                    alt={`${platform.name} logo`}
                    className="h-12 w-auto object-contain grayscale"
                  />
                </div>
                <h4 className="text-sm font-medium mb-2 text-foreground">{platform.name}</h4>
                <p className="text-xs text-muted-foreground">{platform.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            More integrations including Framer and custom APIs are in development
          </p>
        </div>
      </div>
    </section>
  );
};