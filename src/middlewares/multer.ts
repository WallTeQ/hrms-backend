import multer from "multer";

// Memory storage so we can upload directly to Cloudinary
const storage = multer.memoryStorage();
export const upload = multer({ storage });
