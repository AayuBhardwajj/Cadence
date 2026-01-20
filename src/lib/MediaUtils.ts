import imageCompression from 'browser-image-compression';

interface CompressionOptions {
    maxSizeMB: number;
    maxWidthOrHeight: number;
    useWebWorker?: boolean;
    fileType?: string;
}

export const MediaUtils = {
    /**
     * Compresses an image file client-side before upload.
     */
    compressImage: async (file: File, type: 'avatar' | 'cover' | 'post'): Promise<File> => {
        const options: CompressionOptions = {
            maxSizeMB: type === 'avatar' ? 0.2 : 0.8, // 200KB for avatars, 800KB for covers/posts
            maxWidthOrHeight: type === 'avatar' ? 500 : 1920,
            useWebWorker: true,
            fileType: 'image/webp'
        };

        try {
            console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
            const compressedFile = await imageCompression(file, options);
            console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
            return compressedFile;
        } catch (error) {
            console.error('Image compression failed:', error);
            return file; // Fallback to original if compression fails
        }
    },

    /**
     * Generates an optimized URL for Supabase Storage images.
     * Uses Supabase Image Transformations if available (requires Pro plan usually),
     * otherwise returns the public URL.
     * 
     * NOTE: Since we are compressing on upload, the public URL is already optimized!
     */
    getOptimizedUrl: (publicUrl: string, width?: number) => {
        if (!publicUrl) return '';
        // If you had Supabase Image Transformations enabled:
        // return `${publicUrl}?width=${width || 800}&format=webp&quality=80`;

        // For now, return the direct link which points to our pre-compressed WebP
        return publicUrl;
    }
};
