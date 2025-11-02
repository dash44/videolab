import { spawn } from 'child_process';
import { err, log } from '../utils/logger.js';

function argsForPreset(preset, inputPath, outputPath) {
    switch (preset) {
        case '480p':
            return ['-y','-i',inputPath,'-vf','scale=-2:480','-c:v','libx264','-preset','veryfast','-crf','23','-c:a','aac','-b:a','128k',outputPath];
        case 'audio':
            return ['-y','-i',inputPath,'-vn','-acodec','aac','-b:a','128k',outputPath.replace(/\.mp4$/i,'.m4a')];
        case 'thumbnail':
            return ['-y','-i',inputPath,'-ss','00:00:01.000','-vframes','1',outputPath.replace(/\.mp4$/i,'.jpg')];
        case '720p':
        default:
            return ['-y','-i',inputPath,'-vf','scale=-2:720','-c:v','libx264','-preset','veryfast','-crf','22','-c:a','aac','-b:a','128k',outputPath];
    }
}

export async function runFfmpeg(preset, inputPath, outputPath) {
    const args = argsForPreset(preset, inputPath, outputPath);
    log('ffmpeg', args.join(' '));

    await new Promise((resolve, reject) => {
        const p = spawn('ffmpeg', args, { stdio: ['ignore','pipe','pipe'] });
        p.stdout.on('data', d => log(String(d)));
        p.stderr.on('data', d => log(String(d)));
        p.on('error', reject);
        p.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
    });

    // return the actual key suffix that was created (handles audio/thumbnail extension change)
    if (preset === 'audio') return outputPath.replace(/^.*\//,'').replace(/\.mp4$/i,'.m4a');
    if (preset === 'thumbnail') return outputPath.replace(/^.*\//,'').replace(/\.mp4$/i,'.jpg');
    return outputPath.replace(/^.*\//,'');
}
