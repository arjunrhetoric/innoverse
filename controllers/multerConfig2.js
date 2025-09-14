import multer from "multer";
import path from "path";

// Use memory storage
const storage = multer.memoryStorage();

// Allow only ppt, pptx, or pdf files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/pdf" // allow PDFs as well
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .ppt, .pptx, or .pdf files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // Limit file size to 15MB
});

export default upload;
