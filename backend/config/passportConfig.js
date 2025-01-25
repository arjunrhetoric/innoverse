import passport from "passport";
// import {Strategy as GoogleStrategy} from "passport-google-oauth2";
import LocalStrategy from "passport-local";
import User from  "../models/User.js";

passport.use("local",
    new LocalStrategy(
        {usernameField : "email"},
        async(email, password, done) => {
            try {
                const user = await User.findOne({email});
                if(!user) {
                    return done(null, false, {message : "Incorrect email or password."});
                }

                const isMatch = await (password);
                if(!isMatch) {
                    return done(null, false, { message : "Incorrect email or password."})
                }

                return done(null, user);

            } catch (error) {
                return done(err);
            }
        }
    )
)



// passport.use( "google",
//     new GoogleStrategy(
//         {
//             clientID : process.env.GOOGLE_CLIENT_ID, 
//             clientSecret : process.env.GOOGLE_CLIENT_SECRET,
//             callbackURL : 'http://localhost:5000/api/auth/google/callback',
//         },
        
//         async (accessToken, refreshToken, profile, done) => 
//         {
//             try {
                
//                 //Check if the user exists
//                 let user = await User.findOne({ googleId: profile.id });
//                 if(!user) {
//                     //Create a new user without a role
//                     user = new User({
//                         googleId : profile.id,
//                         name : profile.displayName,
//                         email : profile.emails[0].value,
//                         role : null,
//                     });
//                     await user.save();
//                 }
//                 return done(null, user);
//             } catch (error) {
//                 return done(error, null);
//             }
//         }
//     )
// );

passport.serializeUser((user, done) => {
    console.log("Serializing User:", user.id);
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        console.log("Deserializing User for ID:", id);
        const user = await User.findById(id);
        console.log("Deserializing User:", user);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
})


export default passport;