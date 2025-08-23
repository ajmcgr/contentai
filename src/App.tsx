
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
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
import ArticlesDashboard from "./pages/dashboard/ArticlesDashboard";
import Account from "./pages/Account";
import ContentGenerator from "./pages/ContentGenerator";
import HeadlineGenerator from "./pages/tools/HeadlineGenerator";
import MetaDescriptionGenerator from "./pages/tools/MetaDescriptionGenerator";
import KeywordResearch from "./pages/tools/KeywordResearch";
import ContentIdeaGenerator from "./pages/tools/ContentIdeaGenerator";
import BlogTitleGenerator from "./pages/tools/BlogTitleGenerator";
import SEOTitleGenerator from "./pages/tools/SEOTitleGenerator";
import SocialMediaCaptionGenerator from "./pages/tools/SocialMediaCaptionGenerator";
import ContentOutlineGenerator from "./pages/tools/ContentOutlineGenerator";
import ReadabilityChecker from "./pages/tools/ReadabilityChecker";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/dashboard/*" element={<AuthenticatedLayout />}>
            <Route index element={<ArticlesDashboard />} />
            <Route path="articles" element={<div>Articles Dashboard</div>} />
            <Route path="write" element={<div>Write Article</div>} />
            <Route path="topics" element={<div>Topics</div>} />
            <Route path="scheduler" element={<div>Scheduler</div>} />
            <Route path="backlinks" element={<div>Backlinks</div>} />
            <Route path="settings" element={<div>Settings</div>} />
            <Route path="upgrade" element={<div>Upgrade Plan</div>} />
            <Route path="generator" element={<ContentGenerator />} />
            <Route path="account" element={<Account />} />
          </Route>
          <Route element={
            <div className="flex flex-col min-h-screen">
              <div className="flex-grow">
                <Outlet />
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
            <Route path="tools/headline-generator" element={<HeadlineGenerator />} />
            <Route path="tools/meta-description-generator" element={<MetaDescriptionGenerator />} />
            <Route path="tools/keyword-research" element={<KeywordResearch />} />
            <Route path="tools/content-idea-generator" element={<ContentIdeaGenerator />} />
            <Route path="tools/blog-title-generator" element={<BlogTitleGenerator />} />
            <Route path="tools/seo-title-generator" element={<SEOTitleGenerator />} />
            <Route path="tools/social-media-caption-generator" element={<SocialMediaCaptionGenerator />} />
            <Route path="tools/content-outline-generator" element={<ContentOutlineGenerator />} />
            <Route path="tools/readability-checker" element={<ReadabilityChecker />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
