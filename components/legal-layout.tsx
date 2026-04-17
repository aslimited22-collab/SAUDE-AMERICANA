import { NavBar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Container } from "@/components/ui/container";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <main className="flex-1 py-12">
        <Container className="max-w-3xl">
          <h1 className="font-heading text-3xl font-bold text-brand-navy">
            {title}
          </h1>
          <p className="mt-2 text-sm text-brand-gray-dark">
            Last updated: {updated}
          </p>
          <div className="prose prose-neutral mt-8 max-w-none text-brand-gray-dark prose-headings:text-brand-navy prose-a:text-brand-teal">
            {children}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
