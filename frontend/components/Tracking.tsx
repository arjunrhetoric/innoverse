"use client";

import { Button } from "@heroui/button";
import { Card } from "./Card";
import { Textarea } from "@heroui/input";
import { FiClock, FiCode } from "react-icons/fi"; // Using react-icons for icons

export default function ProjectTrackingDashboard() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-8">
        {/* Project Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">AI Chatbot Project</h1>
            <p className="text-muted-foreground">Student: John Doe</p>
          </div>
          <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700">
            In Progress
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Progress</h3>
            <p className="text-3xl font-semibold">33%</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Time Invested</h3>
            <p className="text-3xl font-semibold">65h</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Milestones</h3>
            <p className="text-3xl font-semibold">1/3</p>
          </Card>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: "33%" }}></div>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Design</span>
            <span>Development</span>
            <span>Testing</span>
            <span>Completion</span>
          </div>
        </div>

        {/* Design Phase Section */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Design Phase</h2>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-yellow-50 text-yellow-800">
                PENDING REVIEW
              </span>
            </div>

            <p className="text-muted-foreground mb-4">Create wireframes and user flow diagrams</p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <FiCode className="h-4 w-4" />
                <span>View Code</span>
              </div>
              <div className="flex items-center gap-2">
                <FiClock className="h-4 w-4" />
                <span>20h</span>
              </div>
            </div>

            <Textarea placeholder="Add feedback for the student..." className="mb-4" />

            <div className="flex gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Approve</Button>
              <Button variant="destructive">Request Changes</Button>
            </div>
          </Card>

          {/* Development Section */}
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-semibold">Development</h2>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-green-50 text-green-700">
                APPROVED
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
