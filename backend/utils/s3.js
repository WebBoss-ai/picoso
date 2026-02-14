import dotenv from "dotenv";
dotenv.config();

import AWS from "aws-sdk";
import multer from "multer";
import multerS3 from "multer-s3";

/* ===========================
   ENV VALIDATION
=========================== */
if (
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY ||
  !process.env.AWS_REGION ||
  !process.env.AWS_BUCKET_NAME
) {
  throw new Error("Missing AWS S3 environment variables");
}

/* ===========================
   AWS CONFIG (SDK v2)
=========================== */
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

/* ===========================
   MULTER S3 UPLOAD
=========================== */
export const uploadToS3 = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const fileName = `uploads/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});


/* ===========================
   DELETE FROM S3
=========================== */
export const deleteFromS3 = async (imageUrl) => {
  try {
    if (!imageUrl) return;

    const key = imageUrl.split(".com/")[1];

    await s3
      .deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      })
      .promise();

    return { success: true };
  } catch (error) {
    console.error("S3 Delete Error:", error);
    return { success: false, error };
  }
};
