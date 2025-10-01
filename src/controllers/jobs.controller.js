import { nanoid } from "nanoid/non-secure";
import { JobRepo, VideoRepo } from "../aws/dynamo.js";
import { presignPut, presignGet } from "../aws/s3.js";
import { ok, notfound, forbidden, bad } from "../utils/response.js";
import { canSee } from "../middleware/auth.js";
import { buildOutputKey } from "../services/video.service.js";

const BUCKET = process.env.S3_BUCKET || "videolab-uploads";

export const processJob = async (req, res) => {
  const { assetId, variants } = req.body;
  if (!assetId) return bad(res, "assetId required");
  const asset = await VideoRepo.get(assetId);
  if (!asset?.Item) return notfound(res, "Asset not found");
  if (!canSee(asset.Item.ownerSub, req.user)) return forbidden(res);

  const jobId = nanoid();
  const numVariants = Number(variants);


  const outputs = [];
  for (let v = 1; v <= numVariants; v++) {
    const s3Key = `outputs/${assetId}/v${v}.mp4`;
    const presignedUrl = await presignPut({ bucket: BUCKET, key: s3Key, contentType: "video/mp4" });
    outputs.push({ variant: `v${v}`, s3Key, uploadUrl: presignedUrl });
  }


  await JobRepo.put({
    jobId,
    assetId,
    owner: req.user.sub,
    status: "running",
    outputs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    variants: numVariants,
  });

  return ok(res, { jobId, status: "running", outputs });
};


export const listJobs = async (req, res) => {
  const jobs = await JobRepo.queryByOwner(req.user.sub, { limit: 25 });
  return ok(res, jobs.Items || []);
};


export const getJob = async (req, res) => {
  const { jobId } = req.params;
  const job = await JobRepo.get(jobId);
  if (!job?.Item) return notfound(res);
  if (!canSee(job.Item.owner, req.user)) return forbidden(res);
  return ok(res, job.Item);
};


export const downloadVariant = async (req, res) => {
  const { jobId } = req.params;
  const { variant = "v1" } = req.query;

  const job = await JobRepo.get(jobId);
  if (!job?.Item) return notfound(res);
  if (!canSee(job.Item.owner, req.user)) return forbidden(res);

  const output = job.Item.outputs.find(o => o.variant === variant);
  if (!output) return notfound(res, "Variant not found");

  const url = await presignGet({
    bucket: BUCKET,
    key: output.s3Key,
    responseContentDisposition: `attachment; filename="${jobId}_${variant}.mp4"`,
  });

  return ok(res, { downloadUrl: url });
};
