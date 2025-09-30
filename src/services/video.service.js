import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { s3 } from "../aws/s3.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.S3_BUCKET || "videolab-uploads";

/**
 * Transcodes a video locally, then uploads the result to S3.
 * @param {string} inputPath - Path to the downloaded input file (temp).
 * @param {string} key - The S3 object key for the output.
 * @returns {Promise<{ key: string, size: number }>}
 */
export const transcode = (inputPath, key) => {
  return new Promise((resolve, reject) => {
    const tmpOut = path.join("/tmp", `${path.basename(key)}`);

    console.log("🔧 Starting ffmpeg...");
    console.log("▶️ Input:", inputPath);
    console.log("📤 Output (tmp):", tmpOut);

    const ffmpeg = spawn("ffmpeg", [
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "23",
      "-vf",
      "scale=1280:-2",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-y",
      tmpOut,
    ]);

    let ffmpegError = "";

    ffmpeg.stderr.on("data", (data) => {
      ffmpegError += data.toString();
    });

    ffmpeg.on("close", async (code) => {
      if (code !== 0) {
        console.error("❌ ffmpeg exited with code:", code);
        console.error("🔍 ffmpeg stderr:\n", ffmpegError);
        return reject(new Error(`ffmpeg exited with code ${code}`));
      }

      try {
      
        const fileStream = fs.createReadStream(tmpOut);
        const stats = fs.statSync(tmpOut);

        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: fileStream,
            ContentType: "video/mp4",
          })
        );

        console.log("✅ Uploaded transcoded file to S3:", key);

        fs.unlinkSync(tmpOut);

        resolve({ key, size: stats.size });
      } catch (err) {
        reject(err);
      }
    });
  });
};

/**
 * Builds an S3 object key for a transcoded variant.
 * @param {string} assetId - The asset ID.
 * @param {string} variant - Variant label (e.g. "v1").
 * @returns {string} S3 key for the output object.
 */
export const buildOutputKey = (assetId, variant) =>
  `outputs/${assetId}-${variant}.mp4`;
