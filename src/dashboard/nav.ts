import {
  BarChart3,
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Flag,
  Gavel,
  Headphones,
  Image,
  KanbanSquare,
  LayoutDashboard,
  ListOrdered,
  Mail,
  Map,
  MessageCircle,
  MessageSquareText,
  Palette,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { QueueKind } from "./inbox";

export interface NavItem {
  id: string;
  /** Canonical path without the language prefix */
  path: string;
  /** i18n key and German fallback */
  label: [string, string];
  icon: LucideIcon;
  /** Open items of this queue, shown next to the entry */
  badge?: QueueKind | "all";
  /** A full-screen tool outside the dashboard frame */
  standalone?: boolean;
}

export interface NavGroup {
  id: string;
  label: [string, string];
  items: NavItem[];
  adminOnly?: boolean;
}

export const NAV: NavGroup[] = [
  {
    id: "start",
    label: ["dash.groups.start", "Start"],
    items: [{ id: "overview", path: "/dashboard", label: ["dash.nav.overview", "Übersicht"], icon: LayoutDashboard }],
  },
  {
    id: "social",
    label: ["dash.groups.social", "Social"],
    items: [
      { id: "social", path: "/dashboard/social", label: ["dash.nav.social", "Social-Start"], icon: Share2 },
      { id: "posts", path: "/dashboard/social/posts", label: ["dash.nav.posts", "Post-Generator"], icon: MessageSquareText },
      { id: "radar", path: "/dashboard/social/radar", label: ["dash.nav.radar", "Release-Radar"], icon: CalendarClock },
      { id: "top10", path: "/dashboard/social/top10", label: ["admin.sidebar.topten", "Top 10"], icon: ListOrdered },
      { id: "creator", path: "/social-creator", label: ["socialCreator.title", "Social Pack Creator"], icon: Palette, standalone: true },
    ],
  },
  {
    id: "moderation",
    label: ["dash.groups.moderation", "Moderation"],
    adminOnly: true,
    items: [
      { id: "adminHome", path: "/dashboard/admin", label: ["dash.nav.adminHome", "Admin-Übersicht"], icon: ShieldCheck, badge: "all" },
      { id: "reports", path: "/dashboard/admin/reports", label: ["admin.sidebar.reports", "Meldungen"], icon: Flag, badge: "reports" },
      { id: "comments", path: "/dashboard/admin/comments", label: ["admin.sidebar.comments", "Kommentare"], icon: MessageCircle },
      { id: "images", path: "/dashboard/admin/images", label: ["admin.sidebar.images", "Bilder"], icon: Image, badge: "images" },
      { id: "support", path: "/dashboard/admin/support", label: ["admin.sidebar.support", "Support-Tickets"], icon: Headphones, badge: "support" },
      { id: "dmca", path: "/dashboard/admin/dmca", label: ["admin.sidebar.dmca", "DMCA-Anfragen"], icon: Gavel, badge: "dmca" },
      { id: "logs", path: "/dashboard/admin/logs", label: ["admin.sidebar.logs", "Moderations-Logs"], icon: Shield },
    ],
  },
  {
    id: "community",
    label: ["dash.groups.community", "Community und Inhalte"],
    adminOnly: true,
    items: [
      { id: "users", path: "/dashboard/admin/users", label: ["admin.sidebar.users", "Nutzer"], icon: Users },
      { id: "press", path: "/dashboard/admin/press", label: ["admin.sidebar.press", "Presse"], icon: ClipboardCheck, badge: "press" },
      { id: "content", path: "/dashboard/admin/content", label: ["admin.sidebar.content", "Inhalte"], icon: FileText },
      { id: "categories", path: "/dashboard/admin/categories", label: ["admin.sidebar.categories", "Kategorien"], icon: Tag },
      { id: "newsletter", path: "/dashboard/admin/newsletter", label: ["admin.sidebar.newsletter", "Newsletter"], icon: Mail },
      { id: "jobs", path: "/dashboard/admin/jobs", label: ["jobs.admin.nav", "Jobs"], icon: Briefcase },
    ],
  },
  {
    id: "system",
    label: ["dash.groups.system", "System"],
    adminOnly: true,
    items: [
      { id: "stats", path: "/dashboard/admin/stats", label: ["admin.sidebar.stats", "Statistiken"], icon: BarChart3 },
      { id: "roadmap", path: "/dashboard/admin/roadmap", label: ["dash.nav.roadmap", "Roadmap"], icon: Map },
      { id: "settings", path: "/dashboard/admin/settings", label: ["admin.sidebar.settings", "Einstellungen"], icon: Settings },
    ],
  },
];

/** The groups a person sees: the admin groups only for admins */
export const visibleGroups = (isAdmin: boolean) => NAV.filter((g) => isAdmin || !g.adminOnly);

export const visibleItems = (isAdmin: boolean) => visibleGroups(isAdmin).flatMap((g) => g.items);

/** The entry that matches a path best (longest prefix), for the active state and the page title */
export function activeItem(items: NavItem[], path: string): NavItem | undefined {
  return items
    .filter((i) => !i.standalone && (path === i.path || path.startsWith(`${i.path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

export const QUEUE_ICON: Record<QueueKind, LucideIcon> = {
  reports: Flag,
  support: Headphones,
  dmca: Gavel,
  press: ClipboardCheck,
  images: Image,
  review: KanbanSquare,
};

/** Default pins for the overview's quick access, until someone picks their own */
export const DEFAULT_PINS = { admin: ["reports", "users", "posts", "top10"], team: ["posts", "top10", "creator", "radar"] };
