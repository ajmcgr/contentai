
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img
              src="/lovable-uploads/26bbcb78-84ac-46a3-9fed-739eebd05c90.png"
              alt="Content AI"
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex-1 flex items-center justify-center space-x-6">
            <Link 
              to="/about" 
              className="text-white opacity-90 hover:opacity-100 transition-opacity"
            >
              About
            </Link>
            <Link 
              to="/pricing" 
              className="text-white opacity-90 hover:opacity-100 transition-opacity"
            >
              Pricing
            </Link>
            <a
              href="https://blog.works.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white opacity-90 hover:opacity-100 transition-opacity"
            >
              Blog
            </a>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10 transition-colors"
              onClick={() => navigate('/signin')}
            >
              Sign In
            </Button>
            <Button 
              variant="outline" 
              className="bg-white text-primary hover:bg-white/90 hover:text-primary transition-colors"
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
};
