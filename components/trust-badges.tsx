import { Shield, Users, Monitor, BadgeCheck } from "lucide-react";
import { Container } from "@/components/ui/container";

const badges = [
  { icon: BadgeCheck, label: "Licensed US Providers" },
  { icon: Users, label: "HIPAA-Compliant" },
  { icon: Monitor, label: "100% Online" },
  { icon: Shield, label: "Money-Back Guarantee" },
];

export function TrustBadges() {
  return (
    <div className="border-y bg-brand-gray py-4">
      <Container>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          {badges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 text-brand-navy">
              <badge.icon className="size-5 text-brand-teal" />
              <span className="text-sm font-medium">{badge.label}</span>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
