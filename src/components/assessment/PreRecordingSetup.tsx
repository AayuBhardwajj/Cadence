import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Mic, Sun, Volume2, CheckCircle2, XCircle, User, Loader2 } from 'lucide-react';
import { CadenceButton } from '../ui/CadenceButton';
import { useFaceSensing } from '../../hooks/useFaceSensing';

interface PreRecordingSetupProps {
    onReady: () => void;
}

export const PreRecordingSetup: React.FC<PreRecordingSetupProps> = ({ onReady }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const lightingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [checks, setChecks] = useState<{
        camera: 'pending' | 'granted' | 'denied';
        mic: 'pending' | 'granted' | 'denied';
        lighting: 'pending' | 'good' | 'toodark' | 'toobright';
        noise: 'pending' | 'quiet' | 'noisy';
    }>({
        camera: 'pending',
        mic: 'pending',
        lighting: 'pending',
        noise: 'pending',
    });
    const [audioLevel, setAudioLevel] = useState(0);

    const faceSensing = useFaceSensing({ debug: false });

    useEffect(() => {
        startCamera();
        return () => {
            if (lightingIntervalRef.current) {
                clearInterval(lightingIntervalRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = mediaStream;
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                faceSensing.start(videoRef.current);
            }
            setChecks(prev => ({ ...prev, camera: 'granted', mic: 'granted' }));

            // Audio Analysis
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(mediaStream);
            microphone.connect(analyser);
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkAudio = () => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;
                setAudioLevel(average);

                // Simple noise check (if average > 30 constantly it's noisy)
                if (average > 50) setChecks(prev => ({ ...prev, noise: 'noisy' }));
                else setChecks(prev => ({ ...prev, noise: 'quiet' }));

                requestAnimationFrame(checkAudio);
            };
            checkAudio();

            // Lighting Check (Periodic)
            lightingIntervalRef.current = setInterval(checkLighting, 1000);

        } catch (err) {
            console.error(err);
            setChecks(prev => ({ ...prev, camera: 'denied', mic: 'denied' }));
        }
    };

    const checkLighting = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(videoRef.current, 0, 0, 32, 32); // Small sample
        const imageData = ctx.getImageData(0, 0, 32, 32);
        let brightnessSum = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            brightnessSum += (r + g + b) / 3;
        }
        const avgBrightness = brightnessSum / (32 * 32);

        if (avgBrightness < 50) setChecks(prev => ({ ...prev, lighting: 'toodark' }));
        else if (avgBrightness > 200) setChecks(prev => ({ ...prev, lighting: 'toobright' }));
        else setChecks(prev => ({ ...prev, lighting: 'good' }));
    };

    const isFaceDetected = faceSensing.status === 'active' && faceSensing.latestEvent?.faceDetected === true;
    const isFaceInitializing = faceSensing.status === 'initializing';

    const isPermissionsGranted = checks.camera === 'granted' && checks.mic === 'granted';
    const isButtonDisabled = !isPermissionsGranted || !isFaceDetected;

    let disabledHint: string | null = null;
    if (checks.camera === 'denied' || checks.mic === 'denied') {
        disabledHint = 'Camera and microphone permissions are required to start';
    } else if (checks.camera === 'pending' || checks.mic === 'pending') {
        disabledHint = 'Requesting camera and microphone access…';
    } else if (isFaceInitializing) {
        disabledHint = 'Detecting face…';
    } else if (!isFaceDetected) {
        disabledHint = 'Position your face in frame to continue';
    }

    const checklistItems = [
        { id: 'camera', icon: Video, label: 'Camera Access', status: checks.camera === 'granted' },
        {
            id: 'face',
            icon: User,
            label: 'Face Detected',
            status: isFaceDetected,
            initializing: isFaceInitializing,
            subLabel: isFaceInitializing
                ? 'Detecting face…'
                : !isFaceDetected && checks.camera === 'granted'
                ? 'Position your face in frame'
                : undefined,
        },
        {
            id: 'mic',
            icon: Mic,
            label: 'Microphone Access',
            status: checks.mic === 'granted',
            extra: (
                <div className="flex items-center gap-1 h-1.5 w-24 mt-1.5" aria-label="Audio level meter">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className={`flex-1 h-full rounded-full transition-colors duration-150 ${
                                audioLevel > i * 10 ? 'bg-success' : 'bg-border'
                            }`}
                        />
                    ))}
                </div>
            )
        },
        {
            id: 'light',
            icon: Sun,
            label: 'Lighting Quality',
            status: checks.lighting === 'good',
            subLabel: checks.lighting === 'toodark'
                ? 'Too dark — add more light'
                : checks.lighting === 'toobright'
                ? 'Too bright — reduce direct light'
                : undefined,
        },
        { id: 'noise', icon: Volume2, label: 'Noise Level', status: checks.noise === 'quiet' },
    ];

    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
            {/* Background Grid Pattern */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(var(--color-text-primary) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-4xl bg-surface border border-border rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row my-auto"
            >
                {/* Left Side: Camera Preview */}
                <div className="w-full md:w-[45%] p-6 sm:p-8 flex flex-col items-center justify-center bg-elevated-surface/50 border-b md:border-b-0 md:border-r border-border">
                    <div
                        className={`w-full max-w-[320px] aspect-[4/3] rounded-2xl overflow-hidden border-2 relative bg-black transition-all duration-300 ${
                            checks.camera === 'granted'
                                ? 'border-success shadow-[0_0_20px_rgba(5,150,105,0.2)]'
                                : 'border-border'
                        }`}
                    >
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                            style={{ filter: 'brightness(1.05) contrast(1.02)' }}
                        />
                        <canvas ref={canvasRef} className="hidden" width={32} height={32} />

                        {/* Face Guide Overlay */}
                        {checks.camera === 'granted' && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className={`w-36 h-48 border border-dashed rounded-full transition-colors duration-300 ${
                                    isFaceDetected ? 'border-success/60 opacity-80' : 'border-success/40 opacity-60'
                                }`} />
                            </div>
                        )}
                    </div>

                    {/* Dynamic Face Sensing Badge */}
                    <div className="mt-3 flex items-center justify-center min-h-[1.25rem]">
                        {checks.camera === 'granted' && (
                            isFaceInitializing ? (
                                <p className="text-center text-xs font-semibold text-text-muted flex items-center justify-center gap-1.5">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Detecting face…
                                </p>
                            ) : isFaceDetected ? (
                                <p className="text-center text-xs font-semibold text-success">
                                    Face Detected ✓
                                </p>
                            ) : (
                                <p className="text-center text-xs font-semibold text-text-muted">
                                    No face detected
                                </p>
                            )
                        )}
                    </div>
                </div>

                {/* Right Side: Checklist */}
                <div className="w-full md:w-[55%] p-6 sm:p-8 flex flex-col justify-between">
                    <div>
                        <div className="mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                                Let's Set Up Your Recording 🎥
                            </h2>
                            <p className="text-xs sm:text-sm text-text-muted mt-1">
                                Ensure your environment is ready for the best results.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {checklistItems.map((item, i) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.08 * i }}
                                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                                        item.status
                                            ? 'bg-success/5 border-success/20'
                                            : 'bg-elevated-surface/60 border-border'
                                    }`}
                                >
                                    <div className={`p-2 rounded-lg ${item.status ? 'text-success bg-success/10' : 'text-text-muted bg-surface'}`}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary">{item.label}</p>
                                        {'subLabel' in item && item.subLabel && (
                                            <p className="text-xs text-text-muted mt-0.5">{item.subLabel}</p>
                                        )}
                                        {'extra' in item && item.extra}
                                    </div>
                                    <div className="shrink-0">
                                        {'initializing' in item && item.initializing ? (
                                            <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
                                        ) : item.status ? (
                                            <CheckCircle2 className="w-5 h-5 text-success" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-text-muted" />
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 pt-2">
                        <CadenceButton
                            size="lg"
                            fullWidth
                            onClick={onReady}
                            disabled={isButtonDisabled}
                            className="h-12 text-sm font-semibold shadow-md"
                        >
                            I'm Ready - Start Recording
                        </CadenceButton>
                        {disabledHint && (
                            <p className="text-center text-xs text-text-muted mt-2">
                                {disabledHint}
                            </p>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
