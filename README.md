# 🚀 Innoverse

> A full-stack startup & innovation ecosystem platform — connecting innovators, founders, and collaborators through a feature-rich web application.

---

## 📌 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## About

**Innoverse** is a full-stack web platform built for the innovation community. It enables users to discover and share startup ideas, connect with collaborators, upload documents, communicate in real-time, and authenticate securely via local credentials or OAuth providers (Google & GitHub).

Built with Node.js, Express, EJS templating, and MongoDB, Innoverse follows an MVC architecture and is designed to be clean, scalable, and easy to deploy.

---

## ✨ Features

- 🔐 **Authentication & Authorization** — Local login with bcrypt password hashing, plus OAuth 2.0 via Google and GitHub using Passport.js
- 📧 **Email Notifications** — Transactional emails via Nodemailer (registration, verification, alerts)
- 💬 **Real-Time Communication** — Live chat and event broadcasting powered by Socket.io
- 📁 **File Uploads** — Profile pictures and documents via Multer
- 📄 **PDF Support** — View and interact with PDFs using pdfjs-dist
- 🧠 **Session Management** — Persistent sessions stored in MongoDB via connect-mongo
- 🏢 **Company Email Validation** — Restrict sign-ups to valid corporate email domains
- 🎨 **Responsive UI** — Bootstrap 5-powered views rendered with EJS and ejs-mate layouts
- 🔑 **JWT Support** — Token-based auth for API-level interactions
- 🌐 **CORS-ready** — Configured for cross-origin requests

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Templating | EJS + ejs-mate |
| Database | MongoDB (Mongoose) |
| Authentication | Passport.js (Local, Google OAuth2, GitHub) |
| Real-time | Socket.io |
| File Uploads | Multer |
| Emails | Nodemailer |
| Sessions | express-session + connect-mongo |
| Styling | Bootstrap 5 |
| PDF Viewer | pdfjs-dist |
| Dev Tools | Nodemon, dotenv |

---

## 📁 Project Structure

```
innoverse/
├── config/             # DB connection, Passport strategy config
├── controllers/        # Route handler logic (MVC controllers)
├── middlewares/        # Custom Express middlewares (auth guards, etc.)
├── models/             # Mongoose schemas & models
├── public/
│   └── css/            # Static stylesheets
├── routes/             # Express router files
├── uploads/            # User-uploaded files (gitignored in production)
├── views/              # EJS templates & layouts
├── .gitignore
├── package.json
├── server.js           # App entry point
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/) (local or cloud via MongoDB Atlas)
- npm (comes with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/arjunrhetoric/innoverse.git

# 2. Navigate into the project
cd innoverse

# 3. Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root of the project and fill in the following:

```env
# App
PORT=3000
SESSION_SECRET=your_session_secret_here

# MongoDB
MONGO_URI=mongodb://localhost:27017/innoverse
# or your MongoDB Atlas connection string

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# JWT
JWT_SECRET=your_jwt_secret

# Nodemailer (e.g., Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

> ⚠️ Never commit your `.env` file. It is already in `.gitignore`.

### Running the App

```bash
# Development (with auto-reload via nodemon)
npm start

# The app will be available at:
# http://localhost:3000
```

---

## ☁️ Deployment

Innoverse is a server-side rendered EJS app and needs a Node.js hosting environment. Here are the recommended platforms:

### Option 1 — Render (Recommended, Free Tier Available)

1. Push your code to GitHub (already done ✅)
2. Go to [render.com](https://render.com) and create a new **Web Service**
3. Connect your GitHub repo `arjunrhetoric/innoverse`
4. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node
5. Add all your `.env` variables in the **Environment** tab
6. Deploy 🎉

### Option 2 — Railway

1. Go to [railway.app](https://railway.app)
2. Click **New Project → Deploy from GitHub Repo**
3. Select `innoverse`
4. Add environment variables
5. Railway auto-detects Node.js and deploys

### Option 3 — Cyclic / Vercel (Not Recommended)

> ⚠️ Vercel is designed for serverless and does **not** support persistent Express servers, Socket.io, or Multer file storage well. Avoid unless you restructure the app.

### Production Notes

- Replace `nodemon` with `node` in the start command for production
- Use **MongoDB Atlas** instead of a local MongoDB instance
- Store uploaded files on **Cloudinary** or **AWS S3** rather than the local `uploads/` folder
- Set `NODE_ENV=production` in your environment

---

## 🤝 Contributing

Contributions are welcome! To get started:

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "Add: your feature description"
git push origin feature/your-feature-name
# Open a Pull Request
```

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">Built with ❤️ by <a href="https://github.com/arjunrhetoric">Arjun Singh</a></p>
