
import { HeroSection } from "@/components/dashboard/HeroSection";
import { SocialMediaLogos } from "@/components/dashboard/SocialMediaLogos";
import { Reviews } from "@/components/Reviews";
import { FeaturesSection } from "@/components/dashboard/FeaturesSection";
import { PricingSection } from "@/components/dashboard/PricingSection";
import { FAQSection } from "@/components/dashboard/FAQSection";
import { EnterpriseSection } from "@/components/dashboard/EnterpriseSection";

const Index = () => {
  return (
    <>
      <HeroSection />
      <SocialMediaLogos />
      <Reviews />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
      <EnterpriseSection />
    </>
  );
};

export default Index;
