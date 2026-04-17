import { NavBar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { TrustBadges } from "@/components/trust-badges";
import { Hero } from "@/components/landing/hero";
import { WeightLoss } from "@/components/landing/weight-loss";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ComingSoon } from "@/components/landing/coming-soon";
import { Testimonials } from "@/components/landing/testimonials";
import { TrustBar } from "@/components/landing/trust-bar";
import { FAQ } from "@/components/landing/faq";
import { FinalCTA } from "@/components/landing/final-cta";

export default function Home() {
  return (
    <>
      <NavBar />
      <TrustBadges />
      <main className="flex-1">
        <Hero />
        <WeightLoss />
        <HowItWorks />
        <ComingSoon />
        <Testimonials />
        <TrustBar />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
