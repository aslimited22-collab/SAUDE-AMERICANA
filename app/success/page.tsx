import Link from "next/link";
import {
  CheckCircle,
  CreditCard,
  ClipboardList,
  UserCheck,
  Truck,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const timeline = [
  { icon: CreditCard, label: "Payment completed", done: true },
  { icon: ClipboardList, label: "Complete medical intake", done: false },
  { icon: UserCheck, label: "Provider reviews your case (24–48h)", done: false },
  { icon: Truck, label: "Prescription issued & shipped", done: false },
];

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-gray p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-teal-light">
          <CheckCircle className="size-8 text-brand-teal" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-brand-navy">
          You&apos;re in! Welcome to SlimRx
        </h1>
        <p className="mt-2 text-brand-gray-dark">
          Your subscription is active. Here&apos;s what happens next:
        </p>

        <ol className="mt-6 space-y-4 text-left">
          {timeline.map((item) => (
            <li key={item.label} className="flex items-start gap-3 text-sm">
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                  item.done ? "bg-brand-teal" : "bg-brand-teal-light"
                }`}
              >
                <item.icon
                  className={`size-3.5 ${
                    item.done ? "text-white" : "text-brand-teal-dark"
                  }`}
                />
              </div>
              <span
                className={
                  item.done
                    ? "font-semibold text-brand-navy"
                    : "text-brand-gray-dark"
                }
              >
                {item.label}
              </span>
            </li>
          ))}
        </ol>

        <Link
          href="/medical-intake"
          className={buttonVariants({
            variant: "primary",
            size: "lg",
            className: "mt-8 h-12 w-full text-base",
          })}
        >
          Complete Your Medical Intake
        </Link>

        <p className="mt-4 text-xs text-brand-gray-dark">
          Need help? Contact us at{" "}
          <a
            href="mailto:support@slimrx.com"
            className="text-brand-teal hover:underline"
          >
            support@slimrx.com
          </a>
        </p>
      </div>
    </div>
  );
}
