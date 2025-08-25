import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TypographyQA() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-heading mb-4">Typography QA Testing</h1>
          <p className="text-muted-foreground">
            Testing headline font-weight consistency across all breakpoints.
            View at 375px (mobile), 768px (tablet), and 1280px (desktop).
            All headings should display at font-weight: 500.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Raw HTML Headings */}
          <Card>
            <CardHeader>
              <CardTitle>Raw HTML Headings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h1>H1: This is a main heading</h1>
                <p className="text-sm text-muted-foreground">Should be font-weight: 500 at all breakpoints</p>
              </div>
              <div>
                <h2>H2: This is a section heading</h2>
                <p className="text-sm text-muted-foreground">Should be font-weight: 500 at all breakpoints</p>
              </div>
              <div>
                <h3>H3: This is a subsection heading</h3>
                <p className="text-sm text-muted-foreground">Should be font-weight: 500 at all breakpoints</p>
              </div>
              <div>
                <h4>H4: This is a minor heading</h4>
                <p className="text-sm text-muted-foreground">Should be font-weight: 500 at all breakpoints</p>
              </div>
            </CardContent>
          </Card>

          {/* Utility Classes */}
          <Card>
            <CardHeader>
              <CardTitle>Utility Classes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="h1 text-4xl">H1 Class: Hero-style heading</div>
                <p className="text-sm text-muted-foreground">Should be font-weight: 500 at all breakpoints</p>
              </div>
              <div>
                <div className="h2 text-3xl">H2 Class: Section-style heading</div>
                <p className="text-sm text-muted-foreground">Should be font-weight: 500 at all breakpoints</p>
              </div>
              <div>
                <div className="h3 text-2xl">H3 Class: Subsection-style heading</div>
                <p className="text-sm text-muted-foreground">Should be font-weight: 500 at all breakpoints</p>
              </div>
              <div>
                <div className="h4 text-xl">H4 Class: Minor heading style</div>
                <p className="text-sm text-muted-foreground">Should be font-weight: 500 at all breakpoints</p>
              </div>
            </CardContent>
          </Card>

          {/* Data Attributes */}
          <Card>
            <CardHeader>
              <CardTitle>Data Attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div data-typography="heading" className="text-4xl">Data Heading: Large display heading</div>
                <p className="text-sm text-muted-foreground">Should be font-weight: 500 at all breakpoints</p>
              </div>
              <div>
                <div data-heading className="text-3xl">Data Heading Attr: Medium display heading</div>
                <p className="text-sm text-muted-foreground">Should be font-weight: 500 at all breakpoints</p>
              </div>
            </CardContent>
          </Card>

          {/* Font Weight Variations */}
          <Card>
            <CardHeader>
              <CardTitle>Font Weight Variations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h2 className="font-heading">Explicit font-heading class</h2>
                <p className="text-sm text-muted-foreground">Using Tailwind font-heading (500) class</p>
              </div>
              <div>
                <h2 className="font-semibold">Explicit font-semibold class</h2>
                <p className="text-sm text-muted-foreground">Using font-semibold (600) class</p>
              </div>
              <div>
                <h2 className="font-medium">Explicit font-medium class</h2>
                <p className="text-sm text-muted-foreground">Using font-medium (500) class - matches default</p>
              </div>
              <div>
                <h2 className="font-normal">Explicit font-normal class</h2>
                <p className="text-sm text-muted-foreground">Using font-normal (400) class - will be normalized to 500</p>
              </div>
            </CardContent>
          </Card>

          {/* Responsive Variations (Problem Cases) */}
          <Card>
            <CardHeader>
              <CardTitle>Responsive Variations (Before Fix)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h2 className="font-medium md:font-medium">Desktop font-medium with base</h2>
                <p className="text-sm text-muted-foreground">
                  Has base weight, medium on desktop - should be consistent 500 everywhere
                </p>
              </div>
              <div>
                <h2 className="font-medium lg:font-medium">Large screen font-medium with base</h2>
                <p className="text-sm text-muted-foreground">
                  Has base weight, consistent on large - should be 500 everywhere
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Component Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Component-style Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h1 className="text-4xl md:text-6xl font-reckless text-center mb-4">
                  Hero Section Style Heading
                </h1>
                <p className="text-sm text-muted-foreground">Hero-style heading (should be weight 500)</p>
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-reckless text-center mb-4">
                  Section Heading Style
                </h2>
                <p className="text-sm text-muted-foreground">Section-style heading (should be weight 500)</p>
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-reckless mb-3">
                  Feature Heading Style
                </h3>
                <p className="text-sm text-muted-foreground">Feature-style heading (should be weight 500)</p>
              </div>
            </CardContent>
          </Card>

          {/* Test Instructions */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800">QA Testing Instructions</CardTitle>
            </CardHeader>
            <CardContent className="text-amber-700">
              <div className="space-y-2">
                <p><strong>Breakpoints to test:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>375px (Mobile)</li>
                  <li>768px (Tablet)</li>
                  <li>1280px (Desktop)</li>
                </ul>
                <p className="mt-4"><strong>Expected result:</strong></p>
                <p>All headings (H1-H4) should display with font-weight: 500 at every breakpoint with Reckless font family.</p>
                <p className="mt-4"><strong>How to verify:</strong></p>
                <p>Use browser dev tools to inspect computed styles. The font-weight should be 500 and font-family should include "Reckless" for all heading elements regardless of screen size.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}