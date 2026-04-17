import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-brand-gray p-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal">
        404
      </p>
      <h1 className="mt-2 font-serif text-4xl font-bold text-brand-navy">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-brand-gray-dark">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/"
        className={buttonVariants({
          variant: "primary",
          size: "lg",
          className: "mt-8",
        })}
      >
        Back to SlimRx
      </Link>
    </div>
  );
}
