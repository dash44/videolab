import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export const transcode = (inputPath, outPath) => {
    return new Promise((resolve, reject) => {
        const outputDir = path.dirname(outPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        console.log("🔧 Starting ffmpeg...");
        console.log("▶️ Input:", inputPath);
        console.log("📤 Output:", outPath);

        const ffmpeg = spawn('ffmpeg', [
            '-i', inputPath,
            '-c:v', 'libx264',
            '-preset', 'slow',
            '-crf', '23',
            '-vf', 'scale=1280:-2',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y', outPath
        ]);

        let ffmpegError = "";

        ffmpeg.stderr.on('data', (data) => {
            ffmpegError += data.toString(); // collect full error message
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log("✅ ffmpeg finished successfully.");
                const stats = fs.statSync(outPath);
                resolve({ path: outPath, size: stats.size });
            } else {
                console.error("❌ ffmpeg exited with code:", code);
                console.error("🔍 ffmpeg stderr:\n", ffmpegError);
                reject(new Error(`ffmpeg exited with code ${code}`));
            }
        });
    });
};

export const buildOutputPath = (originalPath, assetId, variant) => (
    path.join(
        path.dirname(originalPath).replace('uploads', 'outputs'),
        `${assetId}-${variant}.mp4`
    )
);
