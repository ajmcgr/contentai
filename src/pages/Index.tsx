
import { HeroSection } from "@/components/dashboard/HeroSection";
import { PlatformsSection } from "@/components/dashboard/PlatformsSection";
import { Reviews } from "@/components/Reviews";
import { FeaturesSection } from "@/components/dashboard/FeaturesSection";
import { ComparisonSection } from "@/components/dashboard/ComparisonSection";
import { AdditionalFeaturesSection } from "@/components/dashboard/AdditionalFeaturesSection";
import { PricingSection } from "@/components/dashboard/PricingSection";
import { FAQSection } from "@/components/dashboard/FAQSection";
import { EnterpriseSection } from "@/components/dashboard/EnterpriseSection";
import FontInspector from "@/components/FontInspector";

const Index = () => {
  return (
    <>
      <HeroSection />
      <PlatformsSection />
      <FeaturesSection />
      <AdditionalFeaturesSection />
      <ComparisonSection />
      <Reviews />
      <PricingSection />
      <FAQSection />
      <EnterpriseSection />
      {process.env.NODE_ENV !== 'production' && <FontInspector />}
    </>
  );
};

export default Index;
