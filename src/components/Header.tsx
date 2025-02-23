
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

export const Header = () => {
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
            <Link to="/about" className="text-white hover:text-primary-100">
              About
            </Link>
            <Link to="/pricing" className="text-white hover:text-primary-100">
              Pricing
            </Link>
            <a
              href="https://blog.works.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-primary-100"
            >
              Blog
            </a>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-white hover:text-primary-100" asChild>
              <Link to="/signin">Sign In</Link>
            </Button>
            <Button variant="outline" className="bg-white text-primary hover:bg-primary-100" asChild>
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
};
