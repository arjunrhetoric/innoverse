import ProblemStatement from "../models/ProblemStatement.js";


//Post a problem (Startup Only)
 export const postProblem  = async (req, res) => {
    try {
        const {title, description, skillsRequired } = req.body;

        //Ensure if the user is authenticated and a startup
        if(!req.user || req.user.role !== "Startup") {
            return res.status(403).json({ message: "Unauthorized : Only startups can post problem statements"});
        }

        //Validate input
        if(!title || !description) {
            return res.status(400).json({ message : "Title and description are required!"});
        }

        //Create the problem statement
        const problem = new ProblemStatement({
            title, 
            description,
            skillsRequired,
            createdBy: req.user.id,
        });

        await problem.save();
        res.status(201).json({ message : "Problem Statement posted successfully", problem});
    } catch (error) {
        res.status(500).json({ message : "Error posting problem statement", err : error.message});
    }
};

export const getProblems = async (req, res) => {
    try {
      const problems = await ProblemStatement.find().populate("createdBy", "name email");
      res.status(200).json({ message: "Problems fetched successfully", problems });
    } catch (error) {
      res.status(500).json({ message: "Error fetching problems", error: error.message });
    }
  };

