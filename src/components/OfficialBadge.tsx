import { Badge } from "@/components/ui/badge";
import { BadgeCheck as VerifiedTwoTone } from "lucide-react";
const OfficialBadge = () => (
  <Badge className="gap-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 border-0">
    <VerifiedTwoTone className="w-3.5 h-3.5" />
    OFFICIAL
  </Badge>
);

export default OfficialBadge;
