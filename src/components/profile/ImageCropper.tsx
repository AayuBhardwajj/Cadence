import React, { useState, useCallback } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../dashboard/EnhancedCard';

interface ImageCropperProps {
    image: string;
    aspect: number;
    onCropComplete: (file: File) => void;
    onCancel: () => void;
    title?: string;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
    image,
    aspect,
    onCropComplete,
    onCancel,
    title = "Adjust Image"
}) => {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropChange = (crop: Point) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            if (!croppedAreaPixels) return;
            const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
            onCropComplete(croppedImage);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        >
            <EnhancedCard className="w-full max-w-3xl overflow-hidden bg-[#0a0a1a] border-white/10 shadow-2xl relative">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight uppercase">{title}</h3>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Drag and zoom to adjust</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative h-[400px] w-full bg-black/40">
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspect}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onRotationChange={setRotation}
                        onCropComplete={onCropCompleteInternal}
                        classes={{
                            containerClassName: "bg-black/20",
                            mediaClassName: "max-w-none",
                            cropAreaClassName: "border-2 border-blue-500/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
                        }}
                    />
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <ZoomOut className="w-4 h-4 text-white/40" />
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="flex-grow h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                            />
                            <ZoomIn className="w-4 h-4 text-white/40" />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setZoom(1); setRotation(0); setCrop({ x: 0, y: 0 }); }}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase text-white/60 tracking-widest transition-all flex items-center gap-2"
                                >
                                    <RotateCcw className="w-3 h-3" /> Reset
                                </button>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={onCancel}
                                    className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase text-white/40 hover:text-white tracking-[0.2em] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Apply Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </EnhancedCard>
        </motion.div>
    );
};

// Utility function to get the cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

// Utility to calculate bounding box of a rotated rectangle
const rotateSize = (width: number, height: number, rotation: number) => {
    const rotRad = (rotation * Math.PI) / 180;
    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
};

async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
): Promise<File> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    );

    // set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // translate canvas context to a central point and rotate around it
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-image.width / 2, -image.height / 2);

    // draw rotated image
    ctx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');

    if (!croppedCtx) {
        throw new Error('No 2d context');
    }

    // Set the size of the final cropped canvas
    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    // Draw the rotated image from the first canvas onto the cropped canvas
    croppedCtx.drawImage(
        canvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve) => {
        croppedCanvas.toBlob((file) => {
            if (file) {
                resolve(new File([file], 'cropped_image.webp', { type: 'image/webp' }));
            }
        }, 'image/webp', 0.95);
    });
}
