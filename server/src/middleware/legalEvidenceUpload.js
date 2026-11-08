import multer from "multer";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
export const uploadLegalEvidence = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(request, file, callback) {
    if (!allowedTypes.has(file.mimetype)) return callback(Object.assign(new Error("Evidence must be PDF, JPEG, or PNG"), { status: 422 }));
    callback(null, true);
  },
}).single("evidence");
