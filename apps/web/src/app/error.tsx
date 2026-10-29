"use client";

import { useEffect } from "react";
import { RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <p className="font-mono text-2xs uppercase tracking-[0.13em] text-subtle-foreground">
          Something broke
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          This view failed to load
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The page hit an unexpected error. Retrying usually fixes it; if it keeps
          happening, the underlying record may be unavailable.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-2xs text-subtle-foreground">ref {error.digest}</p>
        )}
        <div className="mt-7 flex flex-wrap gap-2">
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
