import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-white py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Logo or Name */}
          <div className="text-lg font-bold mb-4 md:mb-0">
            © 2025 YourCompanyName
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-6 mb-4 md:mb-0">
            <a
              href="#about"
              className="hover:text-gray-300 transition-colors duration-200"
            >
              About
            </a>
            <a
              href="#services"
              className="hover:text-gray-300 transition-colors duration-200"
            >
              Services
            </a>
            <a
              href="#contact"
              className="hover:text-gray-300 transition-colors duration-200"
            >
              Contact
            </a>
          </div>

          {/* Social Media Icons */}
          <div className="flex space-x-4">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 transition-colors duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
                className="w-5 h-5"
              >
                <path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.29 4.29 0 001.88-2.37 8.36 8.36 0 01-2.69 1.03 4.26 4.26 0 00-7.3 3.88 12.08 12.08 0 01-8.77-4.45 4.26 4.26 0 001.32 5.68 4.2 4.2 0 01-1.93-.54v.05a4.26 4.26 0 003.42 4.18 4.26 4.26 0 01-1.92.07 4.27 4.27 0 003.99 2.97 8.56 8.56 0 01-5.3 1.83A8.33 8.33 0 012 19.54a12.09 12.09 0 006.56 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19-.01-.37-.02-.56A8.7 8.7 0 0024 5.1a8.4 8.4 0 01-2.54.7z" />
              </svg>
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 transition-colors duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
                className="w-5 h-5"
              >
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.65 9.12 8.44 9.88v-6.99h-2.54v-2.89h2.54v-2.22c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.44h-1.26c-1.24 0-1.63.77-1.63 1.56v1.91h2.78l-.44 2.89h-2.34v6.99C18.35 21.12 22 16.99 22 12z" />
              </svg>
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 transition-colors duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
                className="w-5 h-5"
              >
                <path d="M22.23 0H1.77C.79 0 0 .77 0 1.73v20.55C0 23.23.79 24 1.77 24h20.46c.97 0 1.77-.77 1.77-1.73V1.73C24 .77 23.2 0 22.23 0zM7.09 20.45H3.56V9h3.53v11.45zM5.33 7.52c-1.14 0-2.06-.93-2.06-2.07 0-1.15.92-2.08 2.06-2.08 1.14 0 2.07.93 2.07 2.08 0 1.14-.93 2.07-2.07 2.07zM20.45 20.45h-3.54V14.9c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.44-2.13 2.94v5.64h-3.53V9h3.39v1.56h.05c.47-.89 1.6-1.83 3.28-1.83 3.51 0 4.16 2.31 4.16 5.32v6.4z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
