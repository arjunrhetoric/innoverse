import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure the directory exists
const uploadDir = "uploads/certificates/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration for saving files on disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// File filter to allow only PPT, PPTX, or PDF
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/pdf",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .ppt, .pptx, or .pdf files are allowed"), false);
  }
};

// Multer upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

export default upload;
