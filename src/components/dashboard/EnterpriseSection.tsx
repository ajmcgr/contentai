import { Button } from "@/components/ui/button";

export const EnterpriseSection = () => {
  return (
    <div className="py-20" style={{ backgroundColor: 'hsl(var(--section-white))' }}>
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-reckless mb-6">Enterprise Solutions</h2>
        <p className="text-xl mb-8">
          Custom solutions for high-volume press release needs. Let's discuss how we can help scale your communications.
        </p>
        <Button size="lg" className="bg-primary hover:bg-primary-600">
          Contact Us
        </Button>
      </div>
    </div>
  );
};
