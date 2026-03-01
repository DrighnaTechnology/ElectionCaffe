/**
 * StepDoneAnim — animated circle-checkmark that plays once on mount.
 * Uses pure SVG stroke-dashoffset animation — no dependencies, no emoji.
 */
import React, { useEffect, useRef } from 'react';

interface Props {
  size?: number;
}

export function StepDoneAnim({ size = 18 }: Props) {
  const circleRef = useRef<SVGCircleElement>(null);
  const checkRef  = useRef<SVGPathElement>(null);

  useEffect(() => {
    const c = circleRef.current;
    const k = checkRef.current;
    if (!c || !k) return;

    // reset then replay so re-mounts always animate
    c.style.strokeDashoffset = '66';
    k.style.strokeDashoffset = '20';
    requestAnimationFrame(() => {
      c.style.transition = 'stroke-dashoffset 0.4s cubic-bezier(0.4,0,0.2,1)';
      c.style.strokeDashoffset = '0';
      setTimeout(() => {
        k.style.transition = 'stroke-dashoffset 0.28s cubic-bezier(0.4,0,0.2,1)';
        k.style.strokeDashoffset = '0';
      }, 300);
    });
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, color: 'hsl(var(--brand-primary))' }}
    >
      <circle
        ref={circleRef}
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="66"
        strokeDashoffset="66"
      />
      <path
        ref={checkRef}
        d="M7.5 12L10.8 15.3L16.5 8.7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="20"
        strokeDashoffset="20"
      />
    </svg>
  );
}
