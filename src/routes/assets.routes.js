import { Router } from "express";
import { auth } from "../middleware/auth.js";
import * as ctrl from "../controllers/assets.controller.js";

const router = Router();

/**
 * @route GET /api/v1/assets
 * List assets for the authenticated user
 */
router.get("/", auth(), ctrl.listAssets);

/**
 * @route GET /api/v1/assets/:id
 * Get asset metadata and presigned download URL
 */
router.get("/:id", auth(), ctrl.getAsset);

/**
 * @route POST /api/v1/assets
 * Request presigned URL for uploading an asset
 * Expects JSON body: { filename, mimeType }
 */
router.post("/", auth(), ctrl.upload);

export default router;
