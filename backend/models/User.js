import mongoose from "mongoose";
import bcyrpt from "bcrypt";

const UserSchema  = new mongoose.Schema({
    //  googleId: { 
    //     type: String, 
    //     unique: true
    //  }, 
     name : {
        type : String,
        required : true,
    },
    email : {
        type : String,
        unique : true,
        required : true,
    },
    password : {       //for manual registration
        type : String,
    },
    role : {
        type : String,
        enum : ['Student', 'Startup'],
        required : true,
    },
    businessName : {    //for startups only
        type : String,
    },
    isVerified : {
        type : Boolean,
        default: false, //Kept false until the email is verified
    },
    verificationToken : {
        type : String, //Stores the unique token sent to the user's email
    }
});


UserSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next();
    this.password = await bcyrpt.hash(this.password, 10);
    next();
})

UserSchema.methods.comparePassword = function (candidatePassword) {
    return bcyrpt.compare(candidatePassword, this.password);
};



export default mongoose.model('User', UserSchema);