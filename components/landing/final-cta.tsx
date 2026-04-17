import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function FinalCTA() {
  return (
    <section className="bg-gradient-to-br from-brand-navy via-brand-navy-light to-brand-navy py-20">
      <Container>
        <div className="flex flex-col items-center text-center">
          <h2 className="font-heading text-3xl font-bold text-white md:text-4xl">
            Ready to start your transformation?
          </h2>
          <p className="mt-4 max-w-lg text-lg text-gray-300">
            Join thousands who are already on their journey.
          </p>
          <Link
            href="/intake"
            className={buttonVariants({
              variant: "primary",
              size: "lg",
              className: "mt-8 h-12 px-8 text-base",
            })}
          >
            Get Started Now
          </Link>
        </div>
      </Container>
    </section>
  );
}
