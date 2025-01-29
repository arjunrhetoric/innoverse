import { useState } from "react";
import { FiGithub } from "react-icons/fi";

// Badge Component
const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${className}`}>
    {children}
  </span>
);

// Main Component
export default function ProjectTracking() {
  const [progress, setProgress] = useState(25); // Initial progress percentage

  // Handle submitting a stage for review
  const handleSubmit = (stage) => {
    alert(`${stage} submitted for review.`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-8">Project Tracking: AI Chat Application</h1>

      {/* Progress Timeline */}
      <div className="mb-8">
        {/* Dynamic Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Design</span>
          <span>Development</span>
          <span>Testing</span>
          <span>Completion</span>
        </div>
      </div>

      {/* Project Stages */}
      <div className="space-y-4">
        {/* Design Stage */}
        <div className="p-6 bg-white shadow rounded-lg">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Design</h2>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-gray-500">UI/UX Design Implementation</p>
                <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                  <FiGithub className="h-4 w-4" />
                  <span>View Repository</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-yellow-50 text-yellow-800">Pending</Badge>
                <button
                  onClick={() => handleSubmit("Design")}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Submit for Review
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Development Stage */}
        <div className="p-6 bg-white shadow rounded-lg">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Development</h2>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-gray-500">Core Features Development</p>
                <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                  <FiGithub className="h-4 w-4" />
                  <span>View Repository</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-yellow-50 text-yellow-800">Pending</Badge>
                <button
                  onClick={() => handleSubmit("Development")}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Submit for Review
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Testing Stage */}
        <div className="p-6 bg-white shadow rounded-lg">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Testing</h2>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-gray-500">Integration Testing</p>
                <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                  <FiGithub className="h-4 w-4" />
                  <span>View Repository</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-yellow-50 text-yellow-800">Pending</Badge>
                <button
                  onClick={() => handleSubmit("Testing")}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Submit for Review
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Stage */}
        <div className="p-6 bg-white shadow rounded-lg">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Completion</h2>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-gray-500">Final Review and Deployment</p>
                <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                  <FiGithub className="h-4 w-4" />
                  <span>View Repository</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-yellow-50 text-yellow-800">Pending</Badge>
                <button
                  onClick={() => handleSubmit("Completion")}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Submit for Review
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Button to Dynamically Update Progress */}
      <div className="mt-8">
        <button
          onClick={() => setProgress((prev) => Math.min(prev + 25, 100))}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Increase Progress
        </button>
      </div>
    </div>
  );
}
