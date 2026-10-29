import Link from "next/link";
import { Compass, ShieldCheck, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="w-full max-w-md text-center">
          <p className="font-mono text-2xs uppercase tracking-[0.13em] text-subtle-foreground">
            404
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            This page doesn&apos;t exist
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The link may be out of date, or the challenge, report or profile it pointed to
            was removed. Every active report is still reachable by its verification code.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
                Back to home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/explore">
                <Compass className="h-4 w-4" />
                Explore challenges
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/verify">
                <ShieldCheck className="h-4 w-4" />
                Verify a credential
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
