import express from "express";
import passport from "passport";
import axios from "axios";
import { selectRole, passportlogout } from "../controllers/authController.js";
import { ensureAuth } from "../middlewares/authMiddleware.js";


const router = express.Router();

// Role Selection API
router.post("/role-selection", selectRole);

// GitHub OAuth Login
router.get("/github", passport.authenticate("github", { scope: [ "repo", "read:user", "user:email"] }));

// GitHub Callback
router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  (req, res) => {
    if (!req.user.role) {
      res.redirect("/role-selection");
    } else {
      const redirectPath = req.user.role === "Student" ? "/student-dashboard" : "/startup-dashboard";
      res.redirect(redirectPath);
    }
  }
);

router.get("/github/repos", ensureAuth, async (req, res) => {
  try {
      if (!req.user.githubId) {
          return res.status(400).json({ message: "GitHub account not linked" });
      }

      if (!req.user.accessToken) {
          return res.status(401).json({ message: "GitHub Access Token Missing. Please re-login." });
      }

      const response = await axios.get("https://api.github.com/user/repos", {
          headers: { Authorization: `Bearer ${req.user.accessToken}` },
      });

      res.status(200).json(response.data);
  } catch (error) {
      console.error("GitHub API Error:", error.response?.data || error.message);
      res.status(500).json({ message: "Error fetching GitHub repositories" });
  }
});


router.get("/github/profile", ensureAuth, async (req, res) => {
  try {
    if (!req.user.githubId) {
      return res.status(400).json({ message: "GitHub account not linked" });
    }

    if (!req.user.accessToken || new Date() > new Date(req.user.tokenExpiry)) {
      return res.status(401).json({ message: "GitHub token expired. Please log in again." });
    }

    const response = await axios.get(`https://api.github.com/user/${req.user.githubId}`, {
      headers: { Authorization: `Bearer ${req.user.accessToken}` },
    });

    res.status(200).json({
      name: response.data.name || req.user.name,
      bio: response.data.bio || "No bio available",
      avatar: response.data.avatar_url || "https://via.placeholder.com/80",
      url: response.data.html_url,
    });
  } catch (error) {
    console.error("GitHub Profile Fetch Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Error fetching GitHub profile" });
  }
});


router.get("/github/repos", ensureAuth, async (req, res) => {
  try {
      if (!req.user.accessToken) {
          return res.status(401).json({ message: "GitHub Access Token Missing. Please re-login." });
      }

      const response = await axios.get("https://api.github.com/user/repos", {
          headers: { Authorization: `Bearer ${req.user.accessToken}` },
      });

      res.status(200).json({ repos: response.data });
  } catch (error) {
      console.error("GitHub API Error:", error.response?.data || error.message);
      res.status(500).json({ message: "Error fetching GitHub repositories" });
  }
});

//Logout API (Now Redirects to Home)
router.get("/logout", (req, res) => {
  req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed." });
      req.session.destroy(() => {
          res.clearCookie("connect.sid"); //Clears session properly
          res.redirect("/"); // Redirects to home
      });
  });
});


export default router;
