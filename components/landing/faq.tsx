"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

const faqs = [
  {
    q: "Is SlimRx legit?",
    a: "Absolutely. SlimRx partners with licensed, board-certified physicians in your state. All prescriptions are issued through licensed pharmacies. We are fully compliant with state and federal telehealth regulations.",
  },
  {
    q: "How does the GLP-1 program work?",
    a: "After completing a quick health assessment, you're matched with a licensed provider who reviews your case. If appropriate, they prescribe a GLP-1 medication (such as semaglutide or tirzepatide) that's shipped directly to you. Your provider monitors your progress with regular check-ins.",
  },
  {
    q: "How much does it cost?",
    a: "Plans start at $197/month and include your medication, provider consultations, and ongoing support. There are no hidden fees, and you can cancel anytime. Many patients find this far more affordable than traditional weight loss clinics.",
  },
  {
    q: "Is the medication FDA-approved?",
    a: "The active ingredients in our GLP-1 medications (semaglutide and tirzepatide) are FDA-approved for weight management. Your provider will determine the most appropriate medication based on your individual health profile.",
  },
  {
    q: "How long until I see results?",
    a: "Most patients begin noticing changes within 2–4 weeks. Clinical studies show an average of 15–20% body weight reduction over 12 months. Individual results vary based on factors like starting weight, adherence, and lifestyle.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. SlimRx subscriptions can be cancelled at any time with no penalties or hidden fees. We also offer a 30-day money-back guarantee if you're not satisfied with your program.",
  },
];

export function FAQ() {
  return (
    <Section id="faq" className="bg-white">
      <Container className="max-w-3xl">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold text-brand-navy md:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-brand-gray-dark">
            Everything you need to know about SlimRx.
          </p>
        </div>

        <Accordion className="mt-10">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold text-brand-navy">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-brand-gray-dark">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </Section>
  );
}
