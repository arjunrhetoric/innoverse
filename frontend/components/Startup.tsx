"use client"
import React from "react"
import { Boxes } from "./background-boxes"
import { cn } from "@/utlis/cn"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"
import { Label } from "@radix-ui/react-label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/Card";

export default function StartupRegistrationForm() {
  return (
    <div className="min-h-screen relative w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />

      <Boxes />

      <Card className="relative z-20 w-full max-w-md bg-white/10 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white text-center">Startup Registration</CardTitle>
          <CardDescription className="text-gray-200 text-center">Join our startup ecosystem today</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-white">
                Business Name
              </Label>
              <Input type="text" id="businessName" placeholder="Enter your business name" className="w-full bg-white rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessEmail" className="text-white">
                Business Email Address
              </Label>
              <Input type="email" id="businessEmail" placeholder="Enter your business email" className="w-full bg-white rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <Input type="password" id="password" placeholder="Create a password" className="w-full bg-white rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">
                Confirm Password
              </Label>
              <Input type="password" id="confirmPassword" placeholder="Confirm your password" className="w-full bg-white rounded-lg" />
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full bg-black rounded-lg">
            Register
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

