import express from "express";
import { roleSelection, registerUser, passportlogin, passportlogout} from "../controllers/authController.js";

const router = express.Router();

//Role Selection Endpoint
router.post('/select-role', roleSelection);

//Registration Endpoint
router.post('/register', registerUser);

//Login Endpoint
// router.post('/login', loginUser);

//Passport login
router.post("/login", passportlogin);
//Logout
router.get("/logout", passportlogout);


//Google OAuth Login
// router.get('/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

//Google Auth Callback
// router.get('/google/callback', 
//     passport.authenticate('google', {failureRedirect : '/'}),
//     (req, res) => {
//         //Checking if the user role is set 
//         if(!req.user.role) {
//             res.redirect('/select-role'); //prompt the role selection page
//         } else { 
//             const redirectPath = req.user.role === 'Student' ? '/student/dashboard' : '/startup/dashboard';
//             res.redirect(redirectPath);
//         }
//     }
// );

//Role Selection After Google Auth
// router.post('/select-role', selectRole);



export default router;