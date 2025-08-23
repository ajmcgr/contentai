
import { HeroSection } from "@/components/dashboard/HeroSection";
import { Reviews } from "@/components/Reviews";
import { FeaturesSection } from "@/components/dashboard/FeaturesSection";
import { AdditionalFeaturesSection } from "@/components/dashboard/AdditionalFeaturesSection";
import { PricingSection } from "@/components/dashboard/PricingSection";
import { FAQSection } from "@/components/dashboard/FAQSection";
import { EnterpriseSection } from "@/components/dashboard/EnterpriseSection";

const Index = () => {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <Reviews />
      <AdditionalFeaturesSection />
      <PricingSection />
      <FAQSection />
      <EnterpriseSection />
    </>
  );
};

export default Index;
