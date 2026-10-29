import { Gamepad2, Film, Tv, Globe, Newspaper, Coffee, MessageSquare } from "lucide-react";

export interface ForumCategory {
  key: string;
  label: string;
  icon: any;
  color: string;
  textColor: string;
}

export const FORUM_CATEGORIES: ForumCategory[] = [
  { key: "spiele", label: "Spiele", icon: Gamepad2, color: "bg-muted", textColor: "text-foreground" },
  { key: "filme", label: "Filme", icon: Film, color: "bg-muted", textColor: "text-foreground" },
  { key: "serien", label: "Serien", icon: Tv, color: "bg-muted", textColor: "text-foreground" },
  { key: "allgemein", label: "Allgemein", icon: Globe, color: "bg-muted", textColor: "text-foreground" },
  { key: "news", label: "News", icon: Newspaper, color: "bg-muted", textColor: "text-foreground" },
  { key: "off-topic", label: "Off-Topic", icon: Coffee, color: "bg-muted", textColor: "text-foreground" },
  { key: "feedback", label: "Feedback", icon: MessageSquare, color: "bg-muted", textColor: "text-foreground" },
];

export const getCategoryByKey = (key: string | null) =>
  FORUM_CATEGORIES.find((c) => c.key === key) || FORUM_CATEGORIES.find((c) => c.key === "allgemein")!;
