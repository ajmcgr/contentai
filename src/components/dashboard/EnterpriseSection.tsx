import { Button } from "@/components/ui/button";

export const EnterpriseSection = () => {
  return (
    <div className="py-20" style={{ backgroundColor: 'hsl(var(--comparison-bg))' }}>
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-reckless mb-6 text-white">Enterprise Solutions</h2>
        <p className="text-xl mb-8 text-white/90">
          Custom solutions for high-volume press release needs. Let's discuss how we can help scale your communications.
        </p>
        <Button size="lg" className="bg-white text-gray-900 hover:bg-white/90 hover:text-gray-900">
          Contact Us
        </Button>
      </div>
    </div>
  );
};
