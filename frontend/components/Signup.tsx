"use client";
import React from "react";
import { Label } from "@radix-ui/react-label";
import { Input } from "@heroui/input";
import { cn } from "@/utlis/cn";
import {
  IconBrandGithub,
  IconBrandGoogle,
  IconBrandOnlyfans,
} from "@tabler/icons-react";

export default function SignupFormDemo() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted");
  };

  return (
    <div className="max-w-md w-full mx-auto rounded-lg p-6 md:p-8 shadow-lg bg-black text-white">
      <h2 className="font-bold text-2xl text-center">Welcome to Aceternity</h2>
      <p className="text-neutral-400 text-sm text-center max-w-sm mt-2">
        Login to aceternity if you can because we don&apos;t have a login flow
        yet.
      </p>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabelInputContainer>
            <Label htmlFor="firstname">First Name</Label>
            <Input
              id="firstname"
              placeholder="Tyler"
              type="text"
              className="bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </LabelInputContainer>
          <LabelInputContainer>
            <Label htmlFor="lastname">Last Name</Label>
            <Input
              id="lastname"
              placeholder="Durden"
              type="text"
              className="bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </LabelInputContainer>
        </div>
        <LabelInputContainer>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            placeholder="projectmayhem@fc.com"
            type="email"
            className="bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </LabelInputContainer>
        <LabelInputContainer>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            placeholder="••••••••"
            type="password"
            className="bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </LabelInputContainer>
        <LabelInputContainer>
          <Label htmlFor="twitterpassword">Your Twitter Password</Label>
          <Input
            id="twitterpassword"
            placeholder="••••••••"
            type="password"
            className="bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </LabelInputContainer>

        {/* Primary Button */}
        <button
          className="relative flex items-center justify-center px-6 py-2 w-full text-white font-medium rounded-md bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 shadow-lg hover:from-purple-600 hover:via-pink-500 hover:to-indigo-600 transition-all duration-300 transform hover:scale-105 active:scale-95"
          type="submit"
        >
          Sign up &rarr;
          <BottomGradient />
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-black text-neutral-400">Or continue with</span>
          </div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SocialButton icon={<IconBrandGithub />} label="GitHub" />
          <SocialButton icon={<IconBrandGoogle />} label="Google" />
          <SocialButton icon={<IconBrandOnlyfans />} label="OnlyFans" />
        </div>
      </form>
    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};

const SocialButton = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => {
  return (
    <button
      className="relative flex items-center justify-center px-6 py-2 text-white font-medium rounded-md bg-gradient-to-r from-gray-800 via-gray-900 to-black shadow-lg hover:from-gray-700 hover:via-gray-800 hover:to-gray-900 transition-all duration-300 transform hover:scale-105 active:scale-95"
      type="button"
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );
};
