import { nanoid } from "nanoid/non-secure";
import { VideoRepo } from "../aws/dynamo.js";
import { presignPut, presignGet } from "../aws/s3.js";
import { ok, notfound, forbidden } from "../utils/response.js";
import { canSee } from "../middleware/auth.js";

const BUCKET_UPLOADS = process.env.BUCKET_UPLOADS || "videolab-uploads";

export const listAssets = async (req, res) => {
  const { page = 1, limit = 25 } = req.query;
  const result = await VideoRepo.queryByOwner(req.user.sub, { limit: Number(limit) });
  return ok(res, result.Items || [], { page: Number(page), limit: Number(limit) });
};

export const upload = async (req, res) => {
  try {
    const { filename, mimeType } = req.body;
    if (!filename || !mimeType) {
      return res.status(400).json({ success: false, error: { message: "filename and mimeType required" } });
    }
    const id = nanoid();
    const kind = mimeType.startsWith("image/") ? "image" : "video";
    const s3Key = `uploads/${id}-${filename}`;
    const uploadUrl = await presignPut({ bucket: BUCKET_UPLOADS, key: s3Key, contentType: mimeType });
    await VideoRepo.put({
      assetId: id,
      ownerSub: req.user.sub,
      filename,
      s3Key,
      kind,
      mime: mimeType,
      createdAt: new Date().toISOString(),
    });
    return ok(res, { assetId: id, uploadUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const getAsset = async (req, res) => {
  const { id } = req.params;
  const asset = await VideoRepo.get(id);
  if (!asset?.Item) return notfound(res);
  if (!canSee(asset.Item.ownerSub, req.user)) return forbidden(res);
  const downloadUrl = await presignGet({ bucket: BUCKET_UPLOADS, key: asset.Item.s3Key });
  return ok(res, { ...asset.Item, downloadUrl });
};
