import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * Global keyboard shortcuts for the Redaim workspace.
 *
 * Ctrl/⌘ + K  → Search
 * Ctrl/⌘ + N  → New workspace
 * Ctrl/⌘ + H  → Home
 * Ctrl/⌘ + M  → Meetings
 * Ctrl/⌘ + J  → Inbox
 * Ctrl/⌘ + L  → Library
 * Ctrl/⌘ + I  → Redaim AI
 * Ctrl/⌘ + .  → Toggle dark mode
 * Ctrl/⌘ + ,  → Settings (Profile)
 */

interface ShortcutActions {
  onCreateWorkspace?: () => void;
}

export function useRedaimShortcuts(actions?: ShortcutActions) {
  const navigate = useNavigate();
  const { locale } = useParams();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Don't fire inside input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || editable) return;

      let handled = true;

      switch (e.key.toLowerCase()) {
        case "k":
          navigate(`/${locale}/rw/search`);
          break;
        case "n":
          actions?.onCreateWorkspace?.();
          break;
        case "h":
          navigate(`/${locale}/rw`);
          break;
        case "m":
          navigate(`/${locale}/rw/meetings`);
          break;
        case "j":
          navigate(`/${locale}/rw/inbox`);
          break;
        case "l":
          navigate(`/${locale}/rw/library`);
          break;
        case "i":
          navigate(`/${locale}/rw/ai`);
          break;
        case ",":
          navigate(`/${locale}/profile`);
          break;
        case ".": {
          const root = document.documentElement;
          root.classList.toggle("dark");
          break;
        }
        default:
          handled = false;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, locale, actions]);
}
