// routes/startupRoutes.js
import express from "express";
import User from "../models/User.js";
import axios from "axios";
const router = express.Router();

router.get("/:id", async (req, res) => {
  try {
    const startup = await User.findOne({ _id: req.params.id, role: "Startup" }).select('-certificates ');
    if (!startup) {
      return res.status(404).send("Startup not found");
    }
    const githubResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${startup.accessToken}` },
    });
    const githubProfile = githubResponse.data;
    res.render("startup-profile", { startup, githubProfile, user: startup });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

export default router;
