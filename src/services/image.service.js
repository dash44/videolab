import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
export async function pipeline(inputPath, outPath, iterations=6){
    let img = sharp(inputPath, { failOn:'none' }).ensureAlpha();
    for(let i=0; i < iterations; i++){
        img = img
            .resize({width: 7680, withoutEnlargement: false})
            .sharpen(2, 1.0, 1.5)
            .blur(2.5)
            .modulate({ brightness: 1.05, saturation: 1.1, hue: 15 })
            .gamma(2.2)
            .resize({ width: 3840 })
            .rotate(1)
            .median(3)
            .normalise();
    }
    await img.jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(outPath);
    const st = fs.statSync(outPath);
    return { path: outPath, size: st.size };
}
export const buildOutputPath = (originalPath, assetId, variant) => (
    path.join(path.dirname(originalPath).replace('uploads', 'outputs'), `${assetId}-${variant}.jpg`)
);
