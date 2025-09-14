// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
import passport from "./config/passportConfig.js";
import connectMongo from "connect-mongo";
const MongoStore = connectMongo;
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import proposalRoutes from "./routes/proposalRoutes.js";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import Problem from "./models/Problem.js";
import Proposal from "./models/Proposal.js";
import { ensureAuth } from "./middlewares/authMiddleware.js";
import githubRoutes from "./routes/githubRoutes.js";
import studentProfileRoutes from "./routes/studentProfileRoutes.js";
import startupRoutes from "./routes/startupRoutes.js";
import projectTrackingRoutes from './routes/projectTrackingRoutes.js';
import prRoutes from "./routes/prRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import milestoneRoutes from "./routes/milestoneRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import projectProgressRoutes from "./routes/projectProgressRoutes.js";
import projectAnalyticsRoutes from "./routes/projectAnalyticsRoutes.js";
import milestoneTimelineRoutes from "./routes/milestoneTimelineRoutes.js";
import certificateRoutes from './routes/certificateRoutes.js';


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();
const app = express();

// Set EJS as View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cors({ origin: "http://localhost:5000", credentials: true }));

// Session Middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      secure: false,
    },
  })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/certificates', express.static(path.join(__dirname, 'uploads/certificates')));


// Create HTTP server and setup Socket.IO
import http from "http";
import { Server } from "socket.io";
import Certificate from "./models/Certificate.js";
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5000", // Replace with your frontend URL
    methods: ["GET", "POST"],
  },
});

// Inject Socket.IO instance into each request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/pr", prRoutes);
app.use("/student-github-profile", studentProfileRoutes);
app.use("/startup-profile", startupRoutes);
app.use("/project-tracking-dashboard", projectTrackingRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/project", projectProgressRoutes);      // /api/project/progress
app.use("/api/project", projectAnalyticsRoutes);       // /api/project/analytics
app.use("/api/milestones/timeline", milestoneTimelineRoutes);
app.use("/api/certificates", certificateRoutes);


// Socket.IO – Unified project chat and notifications
io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

  // Handle disconnection
  io.on("disconnect", () => {
    console.log("A user disconnected");
  });


// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: err.message || "An unexpected error occurred" });
});

// View Routes (EJS Rendering)
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    const redirectPath = req.user.role === "Student" ? "/student-dashboard" : "/startup-dashboard";
    return res.redirect(redirectPath);
  }
  res.render("home", { user: req.user });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/role-selection", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  res.render("role-selection", { user: req.user });
});

app.get("/student-dashboard", ensureAuth, async (req, res) => {
  try {
    const problems = await Problem.find().populate("createdBy", "name email");
    const proposals = await Proposal.find({ studentId: req.user._id }).populate({
      path: "problemId",
      select: "title createdBy",
      populate: { path: "createdBy", select: "name _id" },
    });
    const approvedProposals = proposals.filter(p => p.status === "Approved").length;
    res.render("student-dashboard", {
      user: req.user,
      problems: problems || [],
      proposals: proposals || [],
      approvedProposals: approvedProposals || 0,
    });
  } catch (error) {
    console.error("Error loading student dashboard:", error);
    res.status(500).send("Server Error");
  }
});

app.get("/submit/:problemId", ensureAuth, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.problemId);
    if (!problem) return res.status(404).send("Problem not found");
    res.render("submit-proposal", { user: req.user, problemId: req.params.problemId });
  } catch (error) {
    console.error("Error loading proposal form:", error);
    res.status(500).send("Error loading proposal form");
  }
});

app.get("/startup-dashboard", ensureAuth, async (req, res) => {
  try {
    const startupId = req.user._id;
    const challenges = await Problem.find({ createdBy: startupId });
    const proposals = await Proposal.find({ problemId: { $in: challenges.map(c => c._id) } })
      .populate("studentId", "name email")
      .populate({
        path: "problemId",
        select: "title createdBy",
        populate: { path: "createdBy", select: "name _id" },
      });
    res.render("startup-dashboard", {
      user: req.user,
      challenges,
      proposals,
      totalProposals: proposals.length,
      pendingReviews: proposals.filter(p => p.status === "Pending").length,
    });
  } catch (error) {
    console.error("Error loading startup dashboard:", error);
    res.status(500).send("Error loading startup dashboard");
  }
});



app.get("/github-profile", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  // let certificates = "dakshesihfbueiugbh"

  const certificateData = await Certificate.find({ studentId: req.user._id })
            .populate('startupId', 'name githubUsername')
            .populate('problemId', 'title');
  
  // console.log(certificateData)

  res.render("github-profile", { user: req.user , certificates : certificateData});
  console.log("User" , req.user);
  
});

// Start Server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server running on PORT ${port}`);
});