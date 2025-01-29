import fs from "fs";
import path from "path";
import Proposal from "../models/Proposal.js";
import ProblemStatement from "../models/ProblemStatement.js";
import { fileURLToPath } from "url";

// Defining __dirname for ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const submitProposal = async(req, res) => {
    try {
        const { problemId, description, mileStones} = req.body;
        const studentId = req.user._id;
        console.log("Request Body:", req.body);


        //Checking if problem does exists
        const problem = await ProblemStatement.findById(problemId);
        if(!problem) {
            return res.status(400).json({message : "Problem not found"});
        }

        //Checking if the student has already submitted a proposal
        const existingProposal = await Proposal.findOne({ studentId, problemId});
        if(existingProposal) {
            return res.status(400).json({ message : "Proposal already submitted for this problem"});
        }

       // If a file is uploaded, save it to disk
        let filePath = null;
        if (req.file) {
            const uploadsDir = path.join(__dirname, "../uploads");
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir);
            }

            filePath = path.join(uploadsDir, `${Date.now()}-${req.file.originalname}`);
            fs.writeFileSync(filePath, req.file.buffer);
        }

        //Creating a new proposal
        const proposal = new Proposal({
            studentId,
            problemId,
            description,
            mileStones: JSON.parse(mileStones),
            proposalFile: filePath,
        });

        await proposal.save();
        res.status(201).json({ message : "Proposal submitted successfully", proposal});
    } catch (error) {
        res.status(500).json({ message : "Error submitting proposal", err : error.message});
    }
};


const getProposalForProblem =  async (req, res) => {

    try {
        const {problemId} = req.params;

        const proposals = await Proposal.find({ problemId}).populate("studentId", "name email");
        res.status(200).json({ message : "Proposal fetched successfully", proposals});
    } catch (error) {
        res.status(500).json({ message : "Error fetching problems", err: error.message});
    }
};


const reviewProposal = async (req, res) => {
    try {
        const { proposalId} = req.params;
        const {status, feedback} = req.body;

        //Validate status
        if(!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({ message : "Invalid Status"});
        }

        const proposal = await Proposal.findById(proposalId);
        if(!proposal){
            return res.status(404).json({ message : "Proposal not found"});
        }

        proposal.status = status;
        proposal.feedback = feedback;
        await proposal.save();

        res.status(200).json({ message : "Proposal reviews successfully", proposal});
    } catch (error) {
        res.status(500).json({ message : "Error reviewing proposal", err : error.message});
    }
};

export {
    submitProposal,
    getProposalForProblem,
    reviewProposal
}