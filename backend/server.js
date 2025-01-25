import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import connectMongo from 'connect-mongo';
const MongoStore = connectMongo;
import connectDB from "./config/db.js"
import authRoutes from "./routes/authRoutes.js"
import passport from './config/passportConfig.js';
import projectRoutes from "./routes/projectRoutes.js";


dotenv.config({ path: './.env' }); //Loading environment variables
connectDB();    //Connect to MongoDB

const app = express();
app.use(express.json()); //Parsing JSON requests

//Session Middleware
app.use(
    session({
        secret : process.env.SESSION_SECRET,
        resave : false,
        saveUninitialized : false,
        store : MongoStore.create({mongoUrl : process.env.MONGO_URI}),
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            httpOnly: true, // Prevent client-side JS from accessing the cookie
            secure : false,
        },
    })
);


//Passport Middlewares
app.use(passport.initialize());
app.use(passport.session());

//Routes
app.use('/api/auth', authRoutes); //Route for authentication
app.use('/api/projects', projectRoutes); //Project and problem routes

//Starting server
const port = process.env.PORT;
app.listen(port, () => {
    console.log(`Server running on PORT ${port}`);
});

