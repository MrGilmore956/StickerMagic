/**
 * ML-based background removal for stickers
 * Uses @imgly/background-removal for professional-quality transparent PNGs
 */

import * as backgroundRemovalLib from '@imgly/background-removal';

/**
 * Removes background from an image using ML model
 * First time: Downloads ~50MB model (cached in browser)
 * Subsequent uses: Uses cached model
 */
export const removeBackgroundML = async (
    base64Image: string,
    onProgress?: (status: string) => void
): Promise<string> => {
    try {
        onProgress?.('Loading background removal AI...');

        // Convert base64 to Blob
        const response = await fetch(base64Image);
        const blob = await response.blob();

        onProgress?.('Removing background...');

        // Remove background using ML model
        const resultBlob = await backgroundRemovalLib.removeBackground(blob, {
            output: {
                format: 'image/png',
                quality: 0.9
            }
        });

        onProgress?.('Finalizing transparent image...');

        // Convert back to base64
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(resultBlob);
        });
    } catch (error) {
        console.error('ML background removal failed:', error);
        throw error;
    }
};

/**
 * Simple fallback background removal (color-matching)
 * Used when ML removal fails
 */
export const removeBackgroundSimple = async (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Sample corners for background color
            const cornerColors: number[][] = [];
            const sampleSize = 5;

            for (let y = 0; y < sampleSize; y++) {
                for (let x = 0; x < sampleSize; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    cornerColors.push([data[idx], data[idx + 1], data[idx + 2]]);
                }
            }

            const avgR = Math.round(cornerColors.reduce((sum, c) => sum + c[0], 0) / cornerColors.length);
            const avgG = Math.round(cornerColors.reduce((sum, c) => sum + c[1], 0) / cornerColors.length);
            const avgB = Math.round(cornerColors.reduce((sum, c) => sum + c[2], 0) / cornerColors.length);

            const tolerance = 30;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const distance = Math.sqrt(
                    Math.pow(r - avgR, 2) +
                    Math.pow(g - avgG, 2) +
                    Math.pow(b - avgB, 2)
                );

                if (distance < tolerance) {
                    data[i + 3] = 0;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };

        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = base64Image;
    });
};
