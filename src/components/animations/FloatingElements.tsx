import { Box, BoxProps } from "@chakra-ui/react";
import { motion, HTMLMotionProps } from "framer-motion";
import React from "react";

// Types
type MotionBoxProps = Omit<BoxProps, "transition"> & HTMLMotionProps<"div">;

// Chakra-compatible Motion Box
const MotionBox = motion(Box) as React.FC<MotionBoxProps>;

/**
 * FloatingOrb: A circular element that floats gently.
 * Can be used for background elements or badges.
 */
interface FloatingOrbProps extends MotionBoxProps {
    delay?: number;
    duration?: number;
    xRange?: number;
    yRange?: number;
}

export const FloatingOrb: React.FC<FloatingOrbProps> = ({
    children,
    delay = 0,
    duration = 4,
    xRange = 10,
    yRange = 15,
    ...props
}) => {
    return (
        <MotionBox
            animate={{
                y: [0, -yRange, 0],
                x: [0, xRange, 0, -xRange, 0],
                rotate: [0, 2, -2, 0],
            }}
            transition={{
                duration: duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: delay,
            }}
            {...props}
        >
            {children}
        </MotionBox>
    );
};

/**
 * GlassCard: A card with glassmorphism effect.
 */
export const GlassCard: React.FC<BoxProps> = ({ children, ...props }) => {
    return (
        <Box
            bg="rgba(255, 255, 255, 0.08)"
            backdropFilter="blur(16px)"
            borderRadius="xl"
            border="1px solid rgba(255, 255, 255, 0.1)"
            boxShadow="0 8px 32px 0 rgba(31, 38, 135, 0.15)"
            {...props}
        >
            {children}
        </Box>
    );
};

/**
 * PulseGlow: Adds a pulsing glow effect to any component.
 */
export const PulseGlow: React.FC<BoxProps> = ({ children, ...props }) => {
    return (
        <MotionBox
            animate={{
                boxShadow: [
                    "0 0 0 rgba(66, 153, 225, 0.4)",
                    "0 0 20px rgba(66, 153, 225, 0.8)",
                    "0 0 0 rgba(66, 153, 225, 0.4)",
                ],
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
            }}
            borderRadius="full"
            {...props}
        >
            {children}
        </MotionBox>
    );
};
