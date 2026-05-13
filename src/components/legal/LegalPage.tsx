import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type LegalSection = {
  title: string;
  body: string[];
};

type LegalPageProps = {
  badge: string;
  title: string;
  description: string;
  sections: LegalSection[];
};

export function LegalPage({
  badge,
  description,
  sections,
  title,
}: LegalPageProps) {
  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="max-w-4xl">
        <div className="mb-8">
          <Badge variant="neutral">{badge}</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            {description}
          </p>
        </div>

        <Card className="divide-y divide-slate-100 p-0 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          {sections.map((section) => (
            <section className="p-6" key={section.title}>
              <h2 className="text-xl font-semibold text-slate-950">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </Card>
      </Container>
    </main>
  );
}
