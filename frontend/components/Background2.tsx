"use client";
import React from "react";
import { Boxes } from "./background-boxes";
import { cn } from "@/utlis/cn";

export default function BackgroundBoxesDemo() {
  return (
    <div className="min-h-screen relative w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center">
      {/* Overlay with radial gradient */}
      <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />

      {/* Background boxes */}
      <Boxes />

      {/* Content */}
      <h1 className={cn("md:text-4xl text-xl text-white relative z-20")}>
        Tailwind is Awesome
      </h1>
      <p className="text-center mt-2 text-neutral-300 relative z-20">
        Framer motion is the best animation library ngl
      </p>
    </div>
  );
}
