"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Image loader for user-uploaded assets served from an API route.
 * Uses a plain <img> (no optimizer) and degrades to an explicit "unavailable"
 * state instead of a broken-image glyph when the stored bytes cannot be read.
 */
export function AssetImage({
  src,
  alt,
  className,
  fallback = "Unavailable",
  fallbackClassName,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={cn(
          "flex flex-col items-center justify-center gap-1 px-1 text-center text-[9px] leading-tight text-subtle-foreground",
          fallbackClassName
        )}
      >
        <ImageOff className="h-3.5 w-3.5" aria-hidden />
        <span>{failed ? "Preview unavailable" : fallback}</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
    />
  );
}
