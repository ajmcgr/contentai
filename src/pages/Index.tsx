
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <div className="mb-8">
          <img
            src="/lovable-uploads/26bbcb78-84ac-46a3-9fed-739eebd05c90.png"
            alt="Content AI"
            className="h-16 w-auto mx-auto mb-8"
          />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Coming Soon
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto">
          We're building something amazing for your social media scheduling needs. 
          Stay tuned for the launch!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            asChild
            size="lg" 
            className="bg-primary text-white hover:bg-primary/90 text-lg px-8"
          >
            <Link to="/signup">
              Get Early Access <ArrowRight className="ml-2" />
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            asChild
            className="text-lg px-8"
          >
            <Link to="/signin">
              Sign In
            </Link>
          </Button>
        </div>
        
        <div className="mt-12 text-sm text-gray-500">
          <p>Follow us for updates:</p>
          <a 
            href="https://x.com/trycontentai" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:text-primary/80 underline"
          >
            @trycontentai
          </a>
        </div>
      </div>
    </div>
  );
};

export default Index;
