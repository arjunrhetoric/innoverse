import User from "../models/User.js";
import validateCompanyEmail from "company-email-validator";

// Role Selection Controller
const selectRole = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    let { role, businessEmail } = req.body;

    if (!["Student", "Startup"].includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    if (!req.user.email) {
      return res.status(400).json({ message: "GitHub email is missing" });
    }

    let isVerified = false;

    // If role is Startup, validate business email
    if (role === "Startup") {
      if (!businessEmail) {
        console.log("Bypassing business email verification for testing.");
        businessEmail = "test@startup.com";
      } else {
        const isBusinessEmail = validateCompanyEmail.isCompanyEmail(businessEmail);
        if (!isBusinessEmail) {
          return res.status(400).json({ message: "Invalid Business Email Address" });
        }
        isVerified = true;
      }
    }

    // Find and update the user
    const user = await User.findById(req.user.id);
    user.role = role;
    user.isVerified = isVerified;
    user.businessEmail = role === "Startup" ? businessEmail : null;

    await user.save();

    req.session.save(() => {
      const redirectPath = role === "Student" ? "/student-dashboard" : "/startup-dashboard";
      res.json({ message: "Role selected successfully", redirectPath });
    });
  } catch (error) {
    res.status(500).json({ message: "Error selecting role", err: error.message });
  }
};

// Logout Controller
const passportlogout = (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ message: "Logout failed." });
        req.session.destroy(() => {
            res.redirect("/"); // Redirects to home after logout
        });
    });
};

export { selectRole, passportlogout };
