import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SlimRx — Doctor-Guided GLP-1. Real Results. No Waiting Rooms.",
    template: "%s | SlimRx",
  },
  description:
    "Get prescribed GLP-1 medication online with licensed US providers. Personalized weight loss plans, dedicated support, and discreet shipping.",
  openGraph: {
    title: "SlimRx — Doctor-Guided GLP-1 Weight Loss",
    description:
      "Get prescribed GLP-1 medication online with licensed US providers.",
    type: "website",
    locale: "en_US",
    siteName: "SlimRx",
  },
  twitter: {
    card: "summary_large_image",
    title: "SlimRx — Doctor-Guided GLP-1 Weight Loss",
    description:
      "Get prescribed GLP-1 medication online. No waiting rooms.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  name: "SlimRx",
  description:
    "Doctor-guided GLP-1 telehealth platform for personalized weight loss.",
  url: "https://slimrx.com",
  email: "support@slimrx.com",
  medicalSpecialty: "Weight Loss",
  availableService: {
    "@type": "MedicalTherapy",
    name: "GLP-1 Weight Loss Program",
    description:
      "Prescription GLP-1 medication with licensed provider oversight.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
