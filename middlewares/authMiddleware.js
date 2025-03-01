
 export const ensureAuth = (req, res, next) =>  {
    if(req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "Unauthorized : Please log in to continue"});
};

 export const ensureStartupRole = (req, res, next) => {
    console.log("Session in Middleware:", req.session);
    console.log("User in req.user:", req.user);
    if(req.user && req.user.role === "Startup") {
        return next();    
    }
    res.status(403).json({ message : "Forbidden : Only startups can access this resource"});
};


