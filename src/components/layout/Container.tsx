import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The three content widths of the site. The values include the 1rem gutter on each side,
 * so "wide" matches the navbar's container and the others match max-w-6xl / max-w-3xl content.
 * - wide: grids and lists (Games, Filme, News)
 * - default: profile, settings, dashboards
 * - prose: running text (articles, legal pages, job ads)
 */
const WIDTHS = {
  wide: "max-w-[1440px]",
  default: "max-w-[74rem]",
  prose: "max-w-[50rem]",
} as const;

export type ContainerWidth = keyof typeof WIDTHS;

interface ContainerProps {
  children: ReactNode;
  width?: ContainerWidth;
  as?: ElementType;
  className?: string;
}

export function Container({ children, width = "wide", as: Tag = "div", className }: ContainerProps) {
  return <Tag className={cn("mx-auto w-full px-4", WIDTHS[width], className)}>{children}</Tag>;
}
