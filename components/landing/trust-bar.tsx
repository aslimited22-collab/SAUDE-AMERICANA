import { Shield, Truck, Stethoscope, DollarSign } from "lucide-react";
import { Container } from "@/components/ui/container";

const items = [
  { icon: Shield, label: "Money-Back Guarantee" },
  { icon: Truck, label: "Free Expedited Delivery" },
  { icon: Stethoscope, label: "Doctor-Led Plans" },
  { icon: DollarSign, label: "No Hidden Fees" },
];

export function TrustBar() {
  return (
    <div className="border-y bg-white py-10">
      <Container>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-brand-teal-light">
                <item.icon className="size-6 text-brand-teal-dark" />
              </div>
              <span className="text-sm font-semibold text-brand-navy">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
