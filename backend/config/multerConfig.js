import multer from "multer";
import path from "path";

//Defining storage confirmation
const storage = multer.memoryStorage();

//Filter to allow only ppt or pdf
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only .ppt or .pdf files are allowed"), false);
    }
};


//Setup Multer Middleware
const upload = multer({
    storage,
    fileFilter,
    limits : {fileSize: 5 * 1024 * 1024},   //Limit file size to 5MB
});

export default upload;