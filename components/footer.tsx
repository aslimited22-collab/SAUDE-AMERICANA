import Link from "next/link";
import { Container } from "@/components/ui/container";

const footerLinks = {
  Company: [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: "/#faq", label: "FAQ" },
  ],
  Legal: [
    { href: "/terms", label: "Terms & Conditions" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/refund", label: "Refund Policy" },
    { href: "/hipaa", label: "HIPAA Notice" },
  ],
  Programs: [
    { href: "/intake", label: "Weight Loss (GLP-1)" },
    { href: "#", label: "Men's Health (Coming Soon)" },
    { href: "#", label: "Women's Health (Coming Soon)" },
    { href: "#", label: "Peptides (Coming Soon)" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-brand-navy text-white">
      <Container>
        <div className="grid gap-8 py-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <span className="text-xl font-bold">
              Slim<span className="text-brand-teal">Rx</span>
            </span>
            <p className="mt-3 text-sm text-gray-400">
              Doctor-guided GLP-1. Real results. No waiting rooms.
            </p>
            <div className="mt-4 text-sm text-gray-400">
              <p>support@slimrx.com</p>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                {title}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-300 transition-colors hover:text-brand-teal"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="border-t border-gray-700 py-6">
          <p className="text-xs leading-relaxed text-gray-500">
            <strong>Medical Disclaimer:</strong> SlimRx provides access to
            telehealth services and is not a pharmacy. All prescriptions are
            written by independent, licensed healthcare providers. Individual
            results may vary. GLP-1 medications are FDA-approved for specific
            indications. Not all patients will qualify for treatment. This
            website does not provide medical advice, diagnosis, or treatment.
            Always consult your healthcare provider before starting any new
            medication or treatment program.
          </p>
          <p className="mt-4 text-xs text-gray-500">
            &copy; {new Date().getFullYear()} SlimRx. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
