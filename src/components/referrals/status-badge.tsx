import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReferralStatus } from "@/lib/types";

type StatusBadgeProps = {
  status: ReferralStatus;
  className?: string;
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusStyles = {
    RECEIVED: "bg-blue-100 text-blue-800 border-blue-200",
    IN_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
    ACCEPTED: "bg-green-100 text-green-800 border-green-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <Badge
      className={cn("capitalize", statusStyles[status], className)}
      variant="outline"
    >
      {status.replace("_", " ").toLowerCase()}
    </Badge>
  );
}
