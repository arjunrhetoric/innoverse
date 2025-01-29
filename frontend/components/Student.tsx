"use client"
import React from "react"
import { Boxes } from "./background-boxes"
import { cn } from "@/utlis/cn"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"
import { Label } from "@radix-ui/react-label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/Card";

export default function StudentRegistrationForm() {
  return (
    <div className="min-h-screen relative w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />

      <Boxes />

      <Card className="relative z-20 w-full max-w-md bg-white/10 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white text-center">Student Registration</CardTitle>
          <CardDescription className="text-gray-200 text-center">Join our learning community today</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-">
                Full Name
              </Label>
              <Input type="text" id="fullName" placeholder="Enter your full name" className="w-full bg-white rounded-lg text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email Address
              </Label>
              <Input type="email" id="email" placeholder="Enter your email address" className="w-full bg-white rounded-lg text-black"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <Input type="password" id="password" placeholder="Create a password" className="w-full bg-white rounded-lg text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">
                Confirm Password
              </Label>
              <Input type="password" id="confirmPassword" placeholder="Confirm your password" className="w-full bg-white rounded-lg text-black" />
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

