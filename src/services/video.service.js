import { mkdirSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { pipeline } from "node:stream/promises";
import { createWriteStream, createReadStream } from "node:fs";
import path from "node:path";

const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-southeast-2" });
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET;
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET;

function ensureTmp() {
    const dir = "/tmp/videolab";
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
}

async function downloadFromS3(key, toPath) {
    const res = await s3.send(new GetObjectCommand({ Bucket: UPLOADS_BUCKET, Key: key }));
    await pipeline(res.Body, createWriteStream(toPath));
}

async function uploadToS3(fromPath, outKey) {
    const Body = createReadStream(fromPath);
    await s3.send(new PutObjectCommand({ Bucket: OUTPUTS_BUCKET, Key: outKey, Body, ContentType: "video/mp4" }));
}

/**
 * Transcode to 720p MP4 using ffmpeg.
 * Requires ffmpeg installed on the instance
 */
export async function transcodeTo720p({ inputKey }) {
    const tmp = ensureTmp();
    const inputPath = path.join(tmp, "input.mp4");
    const outputPath = path.join(tmp, "output.mp4");

    // 1) Download
    await downloadFromS3(inputKey, inputPath);

    // 2) Run ffmpeg
    await new Promise((resolve, reject) => {
        const args = [
            "-y",
            "-i", inputPath,
            "-vf", "scale=-2:720",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            outputPath,
        ];
        const proc = spawn("ffmpeg", args, { stdio: "inherit" });
        proc.on("exit", (code) => code === 0 ? resolve() : reject(new Error("ffmpeg failed")));
    });

    // 3) Upload
    const base = inputKey.replace(/\.[^/.]+$/, "");
    const outKey = `${base}-720p.mp4`;
    await uploadToS3(outputPath, outKey);

    return { outputKey: outKey };
}
