import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValueEvent } from 'framer-motion';

export const AnimatedCounter: React.FC<{ value: number; duration?: number; suffix?: string }> = ({
    value,
    duration = 2,
    suffix = ""
}) => {
    const springValue = useSpring(0, {
        mass: 1,
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const displayValue = useTransform(springValue, (latest) => Math.floor(latest));
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        springValue.set(value);
    }, [value, springValue]);

    useMotionValueEvent(displayValue, "change", (latest: number) => {
        setCurrent(latest);
    });

    return <span>{current}{suffix}</span>;
};
