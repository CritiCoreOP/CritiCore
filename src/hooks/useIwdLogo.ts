import criticoreFull from "@/assets/criticore-full.png";
import criticoreIti from "@/assets/criticore-iti.png";
import criticoreEventFull from "@/assets/criticore-event-full.gif";
import criticoreEventIti from "@/assets/criticore-event-iti.png";
import criticorePrideFull from "@/assets/criticore-pride-full.png";
import criticorePrideIti from "@/assets/criticore-pride-iti.png";

/** Returns true from now until March 10 00:00 local time */
function isEventActive() {
  const now = new Date();
  // Active on March 9, 2026 (month index 2 = March)
  return now.getFullYear() === 2026 && now.getMonth() === 2 && now.getDate() === 9;
}

/** Pride month – programme ended, no longer active */
export function isPrideActive() {
  return false;
}

/** Full logo – IWD event GIF, Pride rainbow logo, or normal */
export const iwdFullLogo = isEventActive()
  ? criticoreEventFull
  : isPrideActive()
    ? criticorePrideFull
    : criticoreFull;

/** Small/icon logo – red event icon, Pride rainbow icon, or normal */
export const iwdItiLogo = isEventActive()
  ? criticoreEventIti
  : isPrideActive()
    ? criticorePrideIti
    : criticoreIti;

/** Whether the full logo is a GIF that should not loop */
export const isFullLogoGif = isEventActive();
