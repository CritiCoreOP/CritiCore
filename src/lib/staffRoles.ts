import type { TFunction } from "i18next";

// Order on screen: the editorial function first, the desks in menu order, "author" last
const DESKS = ["movies", "series", "anime", "games", "news"] as const;

/**
 * profiles.staff_roles → readable lines, e.g.
 * ["editor_in_chief", "desk_lead_series", "desk_lead_anime", "author"]
 * → ["Chefredaktion", "Ressortleitung Serien und Anime", "Autor"]
 */
export function staffRoleLabels(roles: string[] | null | undefined, t: TFunction): string[] {
  if (!roles?.length) return [];
  const out: string[] = [];
  if (roles.includes("editor_in_chief")) out.push(t("staff.editorInChief"));
  const desks = DESKS.filter((d) => roles.includes(`desk_lead_${d}`)).map((d) => t(`staff.desk.${d}`));
  if (desks.length) {
    // "Serien und Anime", "Filme, Serien und Anime" (Intl.ListFormat is missing from the TS lib here)
    const joined = desks.length === 1 ? desks[0] : `${desks.slice(0, -1).join(", ")} ${t("staff.and")} ${desks[desks.length - 1]}`;
    out.push(t("staff.deskLead", { desks: joined }));
  }
  if (roles.includes("author")) out.push(t("staff.author"));
  return out;
}
