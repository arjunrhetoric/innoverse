import dotenv from "dotenv";
import passport from "passport";
import axios from "axios";
import { Strategy as GithubStrategy } from "passport-github2";
import User from "../models/User.js";

dotenv.config();

passport.use(new GithubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL,
  scope: ["repo", "read:user", "user:email"],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let email = profile.emails && profile.emails[0] ? profile.emails[0].value : "";
    if (!email) {
      // Optionally fetch email if not available
    }
    
    let user = await User.findOne({ githubId: profile.id });
    if (!user) {
      // Create new user with githubUsername
      user = new User({
        githubId: profile.id,
        githubUsername: profile.username,  // Set GitHub username here
        name: profile.displayName || profile.username,
        email,
        accessToken,
        role: null,
      });
    } else {
      // Update access token and githubUsername in case it changed
      user.accessToken = accessToken;
      user.githubUsername = profile.username;
    }
    user.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    return done(null, user);
  } catch (error) {
    console.error("GitHub OAuth Error:", error);
    return done(error);
  }
}));


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
