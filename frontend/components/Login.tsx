"use client";
import React from "react";
import { Label } from "@radix-ui/react-label";
import { Input } from "@heroui/input";
import { cn } from "@/utlis/cn";

export default function LoginForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Login form submitted");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-sm w-full mx-auto rounded-lg p-8 shadow-lg bg-neutral-900">
        <h1 className="font-bold text-2xl text-center text-white mb-6">Login</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <LabelInputContainer>
            <Label htmlFor="email" className="text-white">
              Email Address
            </Label>
            <Input
              id="email"
              placeholder="you@example.com"
              type="email"
              className="bg-neutral-800 text-white border border-neutral-700"
            />
          </LabelInputContainer>
          <LabelInputContainer>
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              className="bg-neutral-800 text-white border border-neutral-700"
            />
          </LabelInputContainer>
          <button
            className="w-full bg-white text-black rounded-md h-10 font-medium hover:bg-neutral-200"
            type="submit"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

const LabelInputContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <div className="flex flex-col space-y-2">{children}</div>;
};
