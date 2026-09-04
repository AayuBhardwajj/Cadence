import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface CadenceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  elevation?: 'flat' | 'default' | 'elevated';
  interactive?: boolean;
  animate?: boolean;
  delay?: number;
}

const elevationStyles = {
  flat: 'bg-surface border border-border',
  default: 'bg-surface border border-border shadow-sm',
  elevated: 'bg-elevated-surface border border-border shadow-md',
};

export const CadenceCard = React.forwardRef<HTMLDivElement, CadenceCardProps>(
  (
    {
      children,
      className,
      elevation = 'default',
      interactive = false,
      animate = false,
      delay = 0,
      onClick,
      ...props
    },
    ref
  ) => {
    const cardClass = cn(
      'relative rounded-2xl p-6 transition-all',
      elevationStyles[elevation],
      interactive && 'cursor-pointer hover:border-brand/40 active:translate-y-px',
      className
    );

    if (animate) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
          onClick={onClick}
          className={cardClass}
          {...(props as HTMLMotionProps<'div'>)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cardClass}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CadenceCard.displayName = 'CadenceCard';
export default CadenceCard;
