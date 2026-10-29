import { toast } from "sonner";

/** Copies a link; on touch devices the system share sheet is the more natural way */
export async function shareLink(url: string, title: string, copiedText: string) {
  const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  if (touch && navigator.share) {
    try {
      await navigator.share({ url, title });
      return;
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success(copiedText);
  } catch {
    toast.error(url);
  }
}
