"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console. Production deployments should
    // forward this to a real error tracker (Sentry, Vercel, etc.).
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-brand-gray p-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
        Something went wrong
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-brand-navy">
        We hit an unexpected error
      </h1>
      <p className="mt-3 max-w-md text-sm text-brand-gray-dark">
        Please try again. If the problem persists, contact{" "}
        <a
          href="mailto:support@slimrx.com"
          className="text-brand-teal hover:underline"
        >
          support@slimrx.com
        </a>
        .
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-brand-gray-dark">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className={buttonVariants({ variant: "primary", size: "lg" })}
        >
          Try again
        </button>
        <Link
          href="/"
          className={buttonVariants({ variant: "secondary", size: "lg" })}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
