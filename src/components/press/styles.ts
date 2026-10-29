export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Colour of a workflow status label; the status is real state, so it gets its own tone */
export const STATUS_TONE: Record<string, string> = {
  idea: "text-muted-foreground",
  research: "text-amber-400",
  writing: "text-sky-400",
  review: "text-accent-light",
  published: "text-emerald-400",
};
