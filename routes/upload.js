// server/routes/upload.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const auth0 = require("../middleware/auth0");
const checkAdmin = require("../middleware/checkAdmin");

const requireAuth =
  auth0 && typeof auth0 === "function" ? auth0 : (req, res, next) => next();

// Storage for multer using Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "jesko-products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({ storage });

/**
 * Upload single image
 * Response: { url, public_id }
 */
router.post(
  "/image",
  requireAuth,
  checkAdmin,
  upload.single("image"),
  (req, res) => {
    try {
      // multer-storage-cloudinary attaches file with path and filename
      // path is the url, filename is public_id
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      res.json({
        url: req.file.path,
        public_id: req.file.filename,
      });
    } catch (err) {
      console.error("Upload failed", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

/**
 * Delete image by public_id or by full URL (public_id preferred)
 * POST body: { public_id } OR { url }
 * This endpoint returns { deleted: true } on success.
 */
router.delete(
  "/image",
  requireAuth,
  checkAdmin,
  express.json(),
  async (req, res) => {
    try {
      const { public_id, url } = req.body;
      let targetId = public_id;

      if (!targetId && url) {
        // derive public_id from url if possible (Cloudinary urls often end with /<public_id>.<ext>)
        try {
          const parts = url.split("/");
          const last = parts[parts.length - 1] || "";
          // remove extension
          targetId = last.replace(/\.[^/.]+$/, "");
          // if folder present, you may need to include folder name; but Cloudinary returns public_id without folder in many cases.
        } catch (e) {
          console.warn("Could not parse public_id from url", e);
        }
      }

      if (!targetId)
        return res.status(400).json({ error: "public_id or url required" });

      const result = await cloudinary.uploader.destroy(targetId, {
        resource_type: "image",
      });
      // result may be { result: 'ok' } or { result: 'not found' } etc.
      if (result.result === "ok" || result.result === "not_found") {
        return res.json({ deleted: true, raw: result });
      }
      return res
        .status(500)
        .json({ error: "Cloudinary deletion failed", raw: result });
    } catch (err) {
      console.error("Delete image error", err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
