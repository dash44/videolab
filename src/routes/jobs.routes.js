import { Router } from "express";
import { auth } from "../middleware/auth.js";
import * as ctrl from "../controllers/jobs.controller.js";

const router = Router();

/**
 * @route POST /api/v1/jobs
 * Create a new job with presigned URLs for outputs
 * Expects JSON body: { assetId, variants }
 */
router.post("/", auth(), ctrl.processJob);

/**
 * @route GET /api/v1/jobs
 * List jobs for authenticated user
 * Optional query: page, limit
 */
router.get("/", auth(), ctrl.listJobs);

/**
 * @route GET /api/v1/jobs/:jobId
 * Get a single job by ID
 */
router.get("/:jobId", auth(), ctrl.getJob);

/**
 * @route GET /api/v1/jobs/:jobId/download
 * Get presigned GET URL for a specific variant
 * Query param: variant=v1|v2|...
 */
router.get("/:jobId/download", auth(), ctrl.downloadVariant);

export default router;
