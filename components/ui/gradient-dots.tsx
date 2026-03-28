'use client';

import React from 'react';
import { motion } from 'framer-motion';

type GradientDotsProps = React.ComponentProps<typeof motion.div> & {
    /** Dot radius in px (default: 1) */
    dotSize?: number;
    /** Grid cell size in px (default: 20) */
    spacing?: number;
    /** Color movement duration in seconds (default: 30) */
    duration?: number;
    /** Hue-rotate cycle duration in seconds (default: 8) */
    colorCycleDuration?: number;
};

export function GradientDots({
    dotSize = 1,
    spacing = 20,
    duration = 30,
    colorCycleDuration = 8,
    className,
    style,
    ...props
}: GradientDotsProps) {
    const hexH = spacing * 1.732;
    const half = spacing / 2;
    const halfH = hexH / 2;

    return (
        <motion.div
            className={`absolute inset-0 ${className ?? ''}`}
            style={{
                ...style,
                backgroundImage: `
                    radial-gradient(circle ${dotSize}px, rgba(99,102,241,0.8) 0%, transparent 100%),
                    radial-gradient(circle ${dotSize}px, rgba(99,102,241,0.8) 0%, transparent 100%),
                    radial-gradient(ellipse at 25% 35%, rgba(99,102,241,0.2) 0%, transparent 70%),
                    radial-gradient(ellipse at 75% 55%, rgba(79,70,229,0.18) 0%, transparent 70%),
                    radial-gradient(ellipse at 50% 85%, rgba(72,88,224,0.15) 0%, transparent 70%)
                `,
                backgroundSize: `
                    ${spacing}px ${hexH}px,
                    ${spacing}px ${hexH}px,
                    150% 150%,
                    150% 150%,
                    150% 150%
                `,
                backgroundPosition: `
                    0px 0px,
                    ${half}px ${halfH}px,
                    0% 0%,
                    100% 100%,
                    50% 100%
                `,
            }}
            animate={{
                filter: ['hue-rotate(0deg)', 'hue-rotate(360deg)'],
            }}
            transition={{
                filter: {
                    duration: colorCycleDuration,
                    ease: 'linear',
                    repeat: Number.POSITIVE_INFINITY,
                },
            }}
            {...props}
        />
    );
}
