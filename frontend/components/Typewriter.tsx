"use client";
import { TypewriterEffectSmooth } from "./typewriter-effect";
export default function TypewriterEffectSmoothDemo() {
  const words = [
    {
      text: "interact",
    },
    {
      text: "with",
    },
    {
      text: "us",
    },
    {
      text: "using our platform",
    },
    {
      text: "INNOVERSE.",
      className: "text-blue-500 dark:text-blue-500",
    },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-[40rem] bg-stone-950">
      <p className="text-neutral-600 dark:text-neutral-200 text-xs sm:text-base">
        The road to freedom starts from here
      </p>
      <TypewriterEffectSmooth words={words} />
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 space-x-0 md:space-x-4">
   <button className="w-40 h-10 rounded-xl bg-white text-black border border-black  text-sm">
          Get Started
        </button>
</div>
</div>
  );
}
