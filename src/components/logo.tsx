import type { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export default function Logo(props: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="https://static.wixstatic.com/media/c5947c_14731b6192f740d8958b7a069f361b4e~mv2.png"
      alt="ReferralFlow Logo"
      {...props}
      className={cn("h-auto w-auto object-contain", props.className)}
    />
  );
}
