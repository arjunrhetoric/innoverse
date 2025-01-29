import mongoose, { Schema } from "mongoose";

const ProposalSchema = new mongoose.Schema( 
    {
        studentId : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User",
            required : true,
        },
        problemId : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "ProblemStatement",
            required : true,
        },
        description : {
            type  : String, 
            required : true,
        },
        mileStones : [{
            title : String,
            description : String,
            deadline : Date,
        },],
        proposalFile : {
            type : String, //Path to the uploaded file
            required : false,
        },
        status : {
            type : String,
            enum : ["Pending", "Approved", "Rejected"],
            default : "Pending",
        },
        feedback: {
            type: String, 
            default: "", 
        },
        createdAt : {
            type : Date,
            default : Date.now,
        },
    });

    export default mongoose.model("Proposal", ProposalSchema);