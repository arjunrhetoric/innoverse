"use client"
import React from "react"
import { Boxes } from "./background-boxes"
import { cn } from "@/utlis/cn"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"
import { Label } from "@radix-ui/react-label"

export default function BackgroundBoxesDemo() {
  return (
    <div className="h-screen relative w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center">
    <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />

      <Boxes />

      <div className="relative z-20 w-full max-w-md p-6 bg-white/10 backdrop-blur-sm rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Login</h2>
        <form className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input type="email" id="email" placeholder="Enter your email" className="w-full bg-white rounded-lg" />
          </div>
          <div>
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <Input type="password" id="password" placeholder="Enter your password" className="w-full bg-white rounded-lg" />
          </div>
          <Button type="submit" className="w-full bg-black rounded-lg">
           Login 
          </Button>
        </form>
      </div>
    </div>
  )
}

