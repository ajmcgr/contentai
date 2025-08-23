import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does article automation work?",
    answer: "Our AI system automatically publishes one SEO-optimized article per day to your website. Articles are generated based on keyword research, scheduled for optimal timing, and include images and videos."
  },
  {
    question: "Is the content SEO friendly?",
    answer: "Yes! Every article includes optimized titles, meta descriptions, targeted keywords, proper H2/H3 structure, 1200–1700 words, and both internal and external linking for maximum SEO impact."
  },
  {
    question: "Can I manage multiple websites?",
    answer: "Absolutely! We offer bulk discounts for multiple websites: 10% off for 2-5 sites, 15% off for 6-10 sites, and 20% off for 11+ sites."
  },
  {
    question: "What integrations do you support?",
    answer: "We integrate with WordPress, Webflow, Shopify, Framer, Notion, Wix, and provide API access for custom solutions."
  },
  {
    question: "Does it support other languages?",
    answer: "Yes! Our AI can generate high-quality articles in over 150 languages, maintaining SEO best practices and natural tone in each language."
  },
  {
    question: "How often are new articles generated?",
    answer: "One article per day, totaling 30 articles per month. This consistent publishing schedule helps build domain authority and search rankings."
  },
  {
    question: "Can I review articles before publishing?",
    answer: "Yes! All articles appear as drafts in your CMS for review and approval before going live. You can edit, modify, or approve them as needed."
  }
];

export const FAQSection = () => {
  return (
    <div className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-reckless font-medium text-center mb-12">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`} 
              className="bg-white rounded-lg shadow-sm border-0 px-6"
            >
              <AccordionTrigger className="text-xl font-reckless font-medium hover:no-underline py-6">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-6">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};
