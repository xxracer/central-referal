import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReferralStatus } from "@/lib/types";

type StatusBadgeProps = {
  status: ReferralStatus;
  className?: string;
  size?: 'sm' | 'md';
};

export default function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const statusStyles = {
    RECEIVED: "bg-blue-100 text-blue-800 border-blue-200",
    IN_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
    ACCEPTED: "bg-green-100 text-green-800 border-green-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
    NEED_MORE_INFO: "bg-orange-100 text-orange-800 border-orange-200",
  };

  const sizeStyles = {
    sm: "px-2 py-0 text-[10px]",
    md: "px-2.5 py-0.5 text-xs"
  };

  return (
    <Badge
      className={cn("capitalize font-semibold", statusStyles[status], sizeStyles[size], className)}
      variant="outline"
    >
      {status.replace("_", " ").toLowerCase()}
    </Badge>
  );
}
