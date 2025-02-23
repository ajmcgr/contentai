
import { useState } from "react";
import { CreateContentDialog } from "./CreateContentDialog";
import { HeroSection } from "./dashboard/HeroSection";
import { SocialMediaLogos } from "./dashboard/SocialMediaLogos";
import { Reviews } from "./Reviews";
import { FeaturesSection } from "./dashboard/FeaturesSection";
import { PricingSection } from "./dashboard/PricingSection";
import { FAQSection } from "./dashboard/FAQSection";
import { EnterpriseSection } from "./dashboard/EnterpriseSection";

export const Dashboard = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <HeroSection />
      <SocialMediaLogos />
      <Reviews />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
      <EnterpriseSection />
      <CreateContentDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
};
