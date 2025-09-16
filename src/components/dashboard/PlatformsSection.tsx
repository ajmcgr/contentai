export const PlatformsSection = () => {
  console.log('PlatformsSection: Component rendering started');
  
  const primaryPlatforms = [
    {
      name: "WordPress",
      logo: "/lovable-uploads/d8fa0a46-f1a4-4e86-a9fa-f2102a039436.png",
      description: "The world's most popular CMS platform",
      subtext: "Seamlessly publish to your WordPress blog with one click",
      users: "43% of all websites",
      gradient: "from-blue-500/20 to-blue-600/30",
      borderColor: "border-blue-500/30 hover:border-blue-500/50"
    },
    {
      name: "Shopify", 
      logo: "/lovable-uploads/93b6287a-d091-4ee7-b4ae-e45ea7a3e122.png",
      description: "Leading e-commerce platform",
      subtext: "Create engaging blog content for your Shopify store",
      users: "1.75M+ businesses",
      gradient: "from-green-500/20 to-green-600/30",
      borderColor: "border-green-500/30 hover:border-green-500/50"
    },
    {
      name: "Wix",
      logo: "/lovable-uploads/4a03d01f-8a2e-4efb-9cbc-a7fd87e0ce20.png",
      description: "Popular website builder",
      subtext: "Publish blogs directly to your Wix site effortlessly",
      users: "200M+ users worldwide",
      gradient: "from-purple-500/20 to-purple-600/30",
      borderColor: "border-purple-500/30 hover:border-purple-500/50"
    }
  ];

  const otherPlatforms = [
    {
      name: "Webflow",
      logo: "/lovable-uploads/dea3f4ce-82f3-48a3-af08-5c64d570b629.png"
    },
    {
      name: "Notion", 
      logo: "/lovable-uploads/3668248b-f746-4b84-85a3-9a25cf2a937e.png"
    },
    {
      name: "Ghost",
      logo: "/lovable-uploads/af07b7e4-6f3c-4202-8e50-f810cca951bc.png"
    },
    {
      name: "Zapier",
      logo: "/lovable-uploads/28858514-61f5-43b3-8eec-762b7b23c1b7.png"
    }
  ];

  console.log('PlatformsSection: primaryPlatforms defined', primaryPlatforms.length);
  console.log('PlatformsSection: otherPlatforms defined', otherPlatforms.length);
  
  return (
    <section className="py-20" style={{ backgroundColor: 'hsl(var(--section-white))' }}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-reckless font-medium text-foreground mb-6">
            Publish to Your Favorite Platform
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Connect and publish your AI-generated content directly to the world's most popular platforms
          </p>
        </div>
        
        {/* Primary Platforms - WordPress, Shopify, Wix */}
        <div className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {primaryPlatforms.map((platform, index) => (
              <div 
                key={index}
                className="relative rounded-2xl p-8 text-center bg-card border-2 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] group"
              >
                <div className="absolute top-6 right-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-500 text-white shadow-lg">
                    ✓ Live
                  </span>
                </div>
                <div className="mb-8 flex justify-center">
                  <div className="p-4 rounded-2xl bg-white shadow-lg group-hover:shadow-xl transition-shadow">
                    <img 
                      src={platform.logo} 
                      alt={`${platform.name} logo`}
                      className="h-16 w-auto object-contain"
                    />
                  </div>
                </div>
                <h3 className="text-2xl font-reckless font-semibold mb-3 text-foreground">{platform.name}</h3>
                <p className="text-lg font-medium mb-3 text-foreground">{platform.description}</p>
                <p className="text-sm text-muted-foreground mb-4">{platform.subtext}</p>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {platform.users}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Other Platforms - Much Smaller */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Additional Platforms Coming Soon
            </h3>
          </div>
          <div className="flex justify-center items-center gap-6 flex-wrap">
            {otherPlatforms.map((platform, index) => (
              <div 
                key={index}
                className="relative rounded-lg p-3 text-center opacity-40 hover:opacity-60 transition-opacity duration-300 bg-muted/50"
              >
                <div className="mb-2 flex justify-center">
                  <img 
                    src={platform.logo} 
                    alt={`${platform.name} logo`}
                    className="h-8 w-auto object-contain grayscale"
                  />
                </div>
                <h4 className="text-xs font-medium text-foreground">{platform.name}</h4>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              More integrations including Framer and custom APIs are in development
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};