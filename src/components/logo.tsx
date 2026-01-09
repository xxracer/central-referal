import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export default function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      className={cn("text-primary", props.className)}
    >
        <path d="M12 2L6.5 5.5V18.5L12 22L17.5 18.5V5.5L12 2Z" />
        <path d="M12 2V22" />
        <path d="M17.5 5.5L6.5 12L17.5 18.5" />
    </svg>
  );
}
