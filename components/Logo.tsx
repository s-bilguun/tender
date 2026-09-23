'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = 'h-9 w-9', size }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      width={size}
      height={size}
      fill="none"
    >
      <defs>
        <radialGradient id="headerBgGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="70%" stopColor="#080D1A" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>

        <linearGradient id="headerRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#1D4ED8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.9" />
        </linearGradient>

        <linearGradient id="headerManeGrad" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="30%" stopColor="#0EA5E9" />
          <stop offset="70%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>

        <linearGradient id="headerCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        <linearGradient id="headerHorseGrad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        <linearGradient id="headerDocGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.98" />
        </linearGradient>
      </defs>

      {/* Circular Badge */}
      <circle cx="256" cy="256" r="246" fill="url(#headerBgGrad)" stroke="url(#headerRimGrad)" strokeWidth="8" />

      {/* Mane Flow Left Curve */}
      <path d="M 256 36 C 140 40 54 130 50 250 C 46 340 106 426 190 460 C 130 430 90 366 94 290 C 98 200 160 120 256 86 Z" fill="url(#headerManeGrad)" />
      <path d="M 210 60 C 130 110 84 190 84 280 C 84 340 114 394 160 430 C 120 380 110 320 120 260 C 136 170 200 100 290 68 C 260 62 234 60 210 60 Z" fill="url(#headerCyanGrad)" opacity="0.9" />
      <path d="M 270 54 C 330 68 376 110 398 160 C 374 136 340 118 300 112 C 340 126 366 150 376 186 C 354 166 324 154 286 154 C 316 166 334 186 340 214 C 310 196 270 190 234 198 C 264 164 280 114 270 54 Z" fill="url(#headerCyanGrad)" />

      {/* White Horse Head Profile */}
      <path d="M 344 116 C 352 144 344 170 338 186 C 362 196 394 230 406 280 C 412 304 404 330 384 336 C 370 340 360 330 354 316 C 348 296 342 278 334 266 C 322 286 318 330 332 374 C 342 404 360 428 350 446 C 342 458 322 458 304 446 C 274 426 256 384 256 334 C 256 264 290 194 334 134 C 340 124 342 118 344 116 Z" fill="url(#headerHorseGrad)" />
      
      {/* Eye */}
      <path d="M 334 212 C 346 220 360 234 366 250 C 354 246 342 238 334 228 Z" fill="#0F172A" />

      {/* Neck Shadow */}
      <path d="M 276 340 C 274 380 292 414 318 438 C 294 426 278 398 274 366 C 270 340 272 316 276 296 Z" fill="#94A3B8" opacity="0.6" />

      {/* Document Icon */}
      <rect x="146" y="210" width="130" height="170" rx="14" fill="url(#headerDocGrad)" stroke="#38BDF8" strokeWidth="7" />
      <path d="M 246 210 L 276 240 L 246 240 Z" fill="#0EA5E9" />
      <path d="M 246 210 L 276 240 L 246 240 Z" stroke="#38BDF8" strokeWidth="4" strokeLinejoin="round" />

      {/* Document Lines */}
      <line x1="172" y1="262" x2="228" y2="262" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
      <line x1="172" y1="288" x2="248" y2="288" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
      <line x1="172" y1="314" x2="216" y2="314" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />

      {/* Analytics Glass */}
      <circle cx="254" cy="336" r="48" fill="#0B1329" stroke="#38BDF8" strokeWidth="9" />
      <circle cx="254" cy="336" r="41" fill="none" stroke="#0284C7" strokeWidth="3" opacity="0.6" />
      <line x1="218" y1="372" x2="174" y2="416" stroke="#38BDF8" strokeWidth="12" strokeLinecap="round" />
      <line x1="214" y1="376" x2="180" y2="410" stroke="#67E8F9" strokeWidth="4" strokeLinecap="round" />
      
      {/* Chart lines */}
      <line x1="234" y1="322" x2="274" y2="322" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
      <line x1="230" y1="336" x2="278" y2="336" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" />
      <line x1="238" y1="350" x2="270" y2="350" stroke="#67E8F9" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
};
