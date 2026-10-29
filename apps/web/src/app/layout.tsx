import type { Metadata } from "next";
import type { Viewport } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { SmoothScroll } from "@/components/smooth-scroll";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

/** Reserved for public credential pages (report / verify). */
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif-display",
});

export const metadata: Metadata = {
  title: {
    default: "Innoverse — Proof of work for early-career hiring",
    template: "%s · Innoverse",
  },
  description:
    "Innoverse connects startups with student developers through real work on GitHub. Every completed challenge produces a verifiable Proof-of-Work Report with a confidence score and reviewer rubric.",
  keywords: ["startups", "students", "technical hiring", "proof of work", "github", "open source"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} ${serif.variable} font-sans`} suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:border focus:border-border focus:bg-elevated focus:px-3 focus:py-2 focus:text-sm focus:text-foreground focus:shadow-md"
        >
          Skip to content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          <Providers>
            <SmoothScroll />
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
