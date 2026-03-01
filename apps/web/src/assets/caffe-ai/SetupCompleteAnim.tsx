/**
 * SetupCompleteAnim — sparkle burst + checkmark shown when all steps are done.
 * Pure CSS/SVG animation, no dependencies.
 */
import React, { useEffect, useRef } from 'react';

export function SetupCompleteAnim({ size = 22 }: { size?: number }) {
  const gRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const g = gRef.current;
    if (!g) return;
    g.style.opacity = '0';
    g.style.transform = 'scale(0.5)';
    requestAnimationFrame(() => {
      g.style.transition = 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
      g.style.opacity   = '1';
      g.style.transform = 'scale(1)';
    });
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <g ref={gRef} style={{ transformOrigin: '50% 50%' }}>
        {/* Outer ring */}
        <circle
          cx="12" cy="12" r="10"
          stroke="hsl(var(--brand-primary))"
          strokeWidth="1.5"
          fill="hsl(var(--brand-primary) / 0.1)"
        />
        {/* Checkmark */}
        <path
          d="M7.5 12L10.8 15.3L16.5 8.7"
          stroke="hsl(var(--brand-primary))"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Sparkle dots */}
        <circle cx="12" cy="2.5"  r="1" fill="hsl(var(--brand-primary))" opacity="0.6" />
        <circle cx="12" cy="21.5" r="1" fill="hsl(var(--brand-primary))" opacity="0.6" />
        <circle cx="2.5" cy="12"  r="1" fill="hsl(var(--brand-primary))" opacity="0.6" />
        <circle cx="21.5" cy="12" r="1" fill="hsl(var(--brand-primary))" opacity="0.6" />
      </g>
    </svg>
  );
}
