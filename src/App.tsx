
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import Blog from "./pages/Blog";
import HelpCenter from "./pages/HelpCenter";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import { SignIn } from "./pages/SignIn";
import { SignUp } from "./pages/SignUp";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AuthenticatedLayout } from "./components/layouts/AuthenticatedLayout";
import DashboardIndex from "./pages/dashboard/Index";
import Account from "./pages/Account";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/dashboard/*" element={<AuthenticatedLayout />}>
            <Route index element={<DashboardIndex />} />
            <Route path="new" element={<div>Create New Post</div>} />
            <Route path="scheduled" element={<div>Scheduled Posts</div>} />
            <Route path="posts" element={<div>Previous Posts</div>} />
            <Route path="account" element={<Account />} />
          </Route>
          <Route element={
            <div className="flex flex-col min-h-screen pt-16">
              <Header />
              <div className="flex-grow">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/help-center" element={<HelpCenter />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/signup" element={<SignUp />} />
                </Routes>
              </div>
              <Footer />
            </div>
          }>
            <Route index element={<Index />} />
            <Route path="about" element={<About />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="blog" element={<Blog />} />
            <Route path="help-center" element={<HelpCenter />} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="signin" element={<SignIn />} />
            <Route path="signup" element={<SignUp />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
