import { Check, X } from "lucide-react";

export const ComparisonSection = () => {
  const features = [
    { feature: "Writes blog content in a human-like style", us: true, chatgpt: false },
    { feature: "Creates tables to compare data insights", us: true, chatgpt: false },
    { feature: "Copy/paste ready HTML and markdown", us: true, chatgpt: false },
    { feature: "Tailored to your brand's style and tone", us: true, chatgpt: false },
    { feature: "Ensures unique and original content", us: true, chatgpt: false },
    { feature: "Generates topic ideas from trends", us: true, chatgpt: false },
    { feature: "Custom visuals and illustrations", us: true, chatgpt: false },
    { feature: "Formats blogs for readability", us: true, chatgpt: false },
    { feature: "SEO high-ranking keywords", us: true, chatgpt: false },
    { feature: "Auto-link relevant pages", us: true, chatgpt: false },
  ];

  return (
    <div className="py-16 md:py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-reckless text-center mb-4 md:mb-8 text-foreground">
          Why Choose Us Over ChatGPT?
        </h2>
        <p className="text-base md:text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-8 md:mb-12">
          See how our specialized blog content platform compares to generic AI tools
        </p>
        
        <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
          <div className="grid grid-cols-3 bg-muted/50 text-xs md:text-sm font-medium">
            <div className="p-3 md:p-4">Feature</div>
            <div className="p-3 md:p-4 text-center border-l">Our Platform</div>
            <div className="p-3 md:p-4 text-center border-l">ChatGPT</div>
          </div>
          
          {features.map((item, index) => (
            <div key={index} className="grid grid-cols-3 border-t">
              <div className="p-3 md:p-4 text-xs md:text-sm">{item.feature}</div>
              <div className="p-3 md:p-4 border-l flex justify-center">
                {item.us ? (
                  <Check className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                ) : (
                  <X className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
                )}
              </div>
              <div className="p-3 md:p-4 border-l flex justify-center">
                {item.chatgpt ? (
                  <Check className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                ) : (
                  <X className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};