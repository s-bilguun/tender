'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * TenderHub mark: a filed document — a solid ink tile with three ruled lines,
 * the last one short and in the accent colour (the line you're looking for).
 */
export const Logo: React.FC<LogoProps> = ({ className = 'h-8 w-8', size }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    className={className}
    width={size}
    height={size}
    fill="none"
    aria-hidden="true"
  >
    <rect width="32" height="32" rx="6" className="fill-slate-900 dark:fill-white" />
    <rect x="8" y="9" width="16" height="2.5" rx="1" className="fill-white dark:fill-zinc-900" />
    <rect x="8" y="14.75" width="16" height="2.5" rx="1" className="fill-white dark:fill-zinc-900" />
    <rect x="8" y="20.5" width="9" height="2.5" rx="1" fill="#3B82F6" />
  </svg>
);
