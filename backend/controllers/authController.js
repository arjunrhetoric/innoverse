import bcrypt from "bcrypt";
import User from "../models/User.js";
import validateCompanyEmail from "company-email-validator";
import passport from "passport";


// Role Selection Controller
const roleSelection = (req, res) => {
    const { role } = req.body;

    if (!['Student', 'Startup'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role selected' });
    }

    const redirectPath = role === 'Student' ? '/student/auth' : '/startup/auth';
    res.json({ redirectPath });
};

// Select Role route for Google OAuth Users
// const selectRole = async (req, res) => {
//     try {
//         const { role } = req.body;

//         // Validate role
//         if (!['Student', 'Startup'].includes(role)) {
//             return res.status(400).json({ message: 'Invalid role' });
//         }

//         // Update user role
//         const user = await User.findById(req.user.id);
//         user.role = role;
//         await user.save();

//         const redirectPath = role === 'Student' ? '/student/dashboard' : '/startup/dashboard';
//         res.json({ message: 'Role selected successfully', redirectPath });
//     } catch (error) {
//         res.status(500).json({ message: 'Error selecting role', err: error.message });
//     }
// };



// Manual Registration
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, businessName } = req.body;

        // Validate role
        if (!['Student', 'Startup'].includes(role)) {
            return res.status(400).json({ message: "Invalid Role" });
        }

        // Validate business email if role is Startup
        if (role === 'Startup') {
            const isBusinessEmail = validateCompanyEmail.isCompanyEmail(email);
            if (!isBusinessEmail) {
                return res.status(400).json({ message: 'Invalid Business Email Address' });
            }
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email Already Registered' });
        }

        // Hash password
        const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            businessName: role == 'Startup' ? businessName : null,
            isVerified : true,
        });

        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', err: error.message });
    }
};

// Manual Login
// const loginUser = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.status(401).json({ message: "Invalid Credentials" });
//         }


//         const isMatch = await bcrypt.compare(password, user.password); // Authenticate the user by comparing passwords
//         if (!isMatch) {
//             return res.status(401).json({ message: "Invalid Credentials" });
//         }

//         req.logIn(user, (err) => {
//             if(err) {
//                 return res.status(500).json({ message: "Error logging in", error: err.message });  
//             }
//             console.log("Request.login started!", user.id);
//             console.log("Session After Login:", req.session);
//         })


//         const redirectPath = user.role === 'Student' ? '/student/dashboard' : '/startup/dashboard'; // Determine role and redirect path

//         // Respond with success and redirect path
//         res.status(200).json({
//             message: "Login successful",
//             user: { name: user.name, email: user.email, role: user.role },
//             redirectPath,
//         });
//     } catch (error) {
//         res.status(500).json({ message: "Error logging in", err: error.message });
//     }
// };

const passportlogin = (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: info.message });

        req.logIn(user, (err) => {
            if (err) return next(err);

            const redirectPath = user.role === "Student" ? "/student/dashboard" : "/startup/dashboard";
            res.status(200).json({ message: "Login successful", user, redirectPath });
        });
    })(req, res, next);
};



const passportlogout = (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed." });
      res.status(200).json({ message: "Logged out successfully." });
    });
  };



export {
    registerUser,
    // loginUser,
    roleSelection,
    passportlogin,
    passportlogout,
};
