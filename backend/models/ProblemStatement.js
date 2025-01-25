import mongoose from "mongoose";

const ProblemSchema = new mongoose.Schema({
        title : {
            type : String,
            required : true,
        },
        description : {
            type: String,
            required: true,
        },
        skillsRequired : {
            type : [String],    //List of required skills
            default: [] 
        },
        createdBy : {
            type: mongoose.Schema.Types.ObjectId,
            ref : "User",   //Reference to the startup user
            required: true,
        },
        createdAt : {
            type: Date,
            default: Date.now,
        },
});

export default mongoose.model("Problem", ProblemSchema);
