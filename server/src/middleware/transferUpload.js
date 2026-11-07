import multer from "multer";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
export const uploadTransferDocument = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(request, file, callback) {
    if (!allowedTypes.has(file.mimetype)) return callback(Object.assign(new Error("Transfer document must be PDF, JPEG, or PNG"), { status: 422 }));
    callback(null, true);
  },
}).single("document");
