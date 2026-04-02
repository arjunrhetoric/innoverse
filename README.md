<div align="center">

<br/>

```
██╗███╗   ██╗███╗   ██╗ ██████╗ ██╗   ██╗███████╗██████╗ ███████╗███████╗
██║████╗  ██║████╗  ██║██╔═══██╗██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝
██║██╔██╗ ██║██╔██╗ ██║██║   ██║██║   ██║█████╗  ██████╔╝███████╗█████╗  
██║██║╚██╗██║██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝  
██║██║ ╚████║██║ ╚████║╚██████╔╝ ╚████╔╝ ███████╗██║  ██║███████║███████╗
╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝
```

### *Where ideas meet execution.*

<br/>

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge&logo=ejs&logoColor=black)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap_5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)

![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)
![Author](https://img.shields.io/badge/Author-Arjun_Singh-orange?style=flat-square)

</div>

---

<br/>

## ◈ What is Innoverse?

**Innoverse** is a full-stack innovation ecosystem platform — a space where startup founders, developers, and collaborators come together. It combines secure authentication, real-time communication, document handling, and a modern content-rich UI into a single cohesive application.

> Built on Node.js + Express with server-side EJS rendering, backed by MongoDB, and wired up with Socket.io for live interactions.

<br/>

---

## ◈ Feature Highlights

<table>
<tr>
<td width="50%">

**🔐 Auth & Identity**
- Local login with `bcrypt` hashing
- OAuth 2.0 via **Google** & **GitHub** (Passport.js)
- JWT token support for API-level auth
- Session persistence via `connect-mongo`

</td>
<td width="50%">

**💬 Real-Time**
- Live messaging & event broadcasting with **Socket.io**
- Instant UI updates without page reload

</td>
</tr>
<tr>
<td width="50%">

**📁 File & Document Handling**
- Profile & document uploads via **Multer**
- In-browser PDF viewing with **pdfjs-dist**

</td>
<td width="50%">

**📧 Communication**
- Transactional emails via **Nodemailer**
- Company email domain validation
- Registration, verification & alert flows

</td>
</tr>
<tr>
<td width="50%">

**🎨 Frontend**
- Fully responsive with **Bootstrap 5**
- Reusable layouts via **ejs-mate**
- Clean MVC separation of concerns

</td>
<td width="50%">

**🛡 Security**
- Password hashing, session secrets, CORS
- Protected routes via custom middlewares
- `.env`-driven config — nothing hardcoded

</td>
</tr>
</table>

<br/>

---

## ◈ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js | Server environment |
| **Framework** | Express.js | HTTP routing & middleware |
| **Templating** | EJS + ejs-mate | Server-side HTML rendering |
| **Database** | MongoDB + Mongoose | Data persistence & ODM |
| **Auth** | Passport.js | Local, Google OAuth2, GitHub OAuth |
| **Real-time** | Socket.io | WebSocket communication |
| **File Uploads** | Multer | Multipart form handling |
| **Email** | Nodemailer | Transactional email delivery |
| **Sessions** | express-session + connect-mongo | Persistent user sessions |
| **Security** | bcrypt, JWT | Password hashing & token auth |
| **Styling** | Bootstrap 5 | Responsive UI components |
| **PDF** | pdfjs-dist | In-browser document viewing |
| **Dev** | Nodemon, dotenv | Hot reload & env management |

<br/>

---

## ◈ Project Structure

```
innoverse/
│
├── 📁 config/              → Database connection & Passport strategy setup
├── 📁 controllers/         → Business logic (MVC controllers)
├── 📁 middlewares/         → Auth guards & custom Express middleware
├── 📁 models/              → Mongoose schemas & data models
├── 📁 routes/              → Express router definitions
├── 📁 views/               → EJS templates & ejs-mate layouts
├── 📁 public/css/          → Static stylesheets
├── 📁 uploads/             → User-uploaded files (use cloud storage in prod)
│
├── 📄 server.js            → App entry point
├── 📄 package.json         → Dependencies & scripts
└── 📄 .env                 → Environment config (never commit this)
```

<br/>

---

## ◈ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) — local or [Atlas](https://cloud.mongodb.com)
- npm

### 1 · Clone & Install

```bash
git clone https://github.com/arjunrhetoric/innoverse.git
cd innoverse
npm install
```

### 2 · Configure Environment

Create a `.env` file in the project root:

```env
# ── Server ──────────────────────────────
PORT=3000
SESSION_SECRET=your_super_secret_here

# ── Database ─────────────────────────────
MONGO_URI=mongodb://localhost:27017/innoverse

# ── Google OAuth ─────────────────────────
GOOGLE_CLIENT_ID=xxxxxxxxxxxx
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# ── GitHub OAuth ─────────────────────────
GITHUB_CLIENT_ID=xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxx
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# ── JWT ──────────────────────────────────
JWT_SECRET=your_jwt_secret

# ── Email (SMTP) ─────────────────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your_app_password
```

> ⚠️ `.env` is already in `.gitignore` — never push secrets to GitHub.

### 3 · Run

```bash
npm start
# → http://localhost:3000
```

<br/>

---

## ◈ Deployment

Innoverse requires a **persistent Node.js server** (Socket.io + sessions + file uploads). Do not deploy to Vercel or Netlify.

<br/>

### ▶ Render *(recommended — free tier available)*

| Step | Action |
|---|---|
| 1 | Go to [render.com](https://render.com) → **New Web Service** |
| 2 | Connect GitHub → select `innoverse` |
| 3 | **Build Command:** `npm install` |
| 4 | **Start Command:** `node server.js` |
| 5 | Add all `.env` variables in the **Environment** tab |
| 6 | Deploy 🚀 |

<br/>

### ▶ Railway *(zero-config Node.js deployment)*

```
railway.app → New Project → Deploy from GitHub → select innoverse → add env vars → done
```

<br/>

### Production Checklist

```
✅  Switch MONGO_URI to MongoDB Atlas (cloud)
✅  Use node server.js (not nodemon) in start command
✅  Update OAuth callback URLs to your live domain
✅  Move file uploads to Cloudinary or AWS S3
✅  Set NODE_ENV=production
```

<br/>

---

## ◈ Contributing

```bash
# Fork → clone → branch
git checkout -b feature/your-feature

# Make changes, then
git commit -m "feat: describe your change"
git push origin feature/your-feature

# Open a Pull Request on GitHub
```

<br/>

---

<div align="center">

---

**Innoverse** · Built by [Arjun Singh](https://github.com/arjunrhetoric) · ISC License

</div>
