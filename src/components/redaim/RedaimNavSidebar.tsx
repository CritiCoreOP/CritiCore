import { useState, useCallback, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Home, Video, Sparkles, Inbox, Library,
  Plus, ChevronRight, ChevronDown, Settings, Trash2,
  FileText, Sun, Moon, Users, MoreHorizontal, HelpCircle,
  PenSquare, Keyboard, ExternalLink, Globe, Gamepad2,
  Palette, Shield, Mail, Newspaper,
} from "lucide-react";
import TwemojiImg from "./TwemojiImg";
import { useAuth } from "@/hooks/useAuth";
import { useRedaimWorkspaces, type RwWorkspace } from "@/hooks/useRedaimWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { useRedaimShortcuts } from "@/hooks/useRedaimShortcuts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RecentPage {
  id: string;
  title: string;
  icon: string;
  workspace_id: string;
}

const mainNav = [
  { id: "search", label: "Search", icon: Search, path: "/rw/search", shortcut: "K" },
  { id: "home", label: "Home", icon: Home, path: "/rw", shortcut: "H" },
  { id: "meetings", label: "Meetings", icon: Video, path: "/rw/meetings", shortcut: "M" },
  { id: "ask-ai", label: "Redaim AI", icon: Sparkles, path: "/rw/ai", shortcut: "I" },
  { id: "inbox", label: "Inbox", icon: Inbox, path: "/rw/inbox", shortcut: "J" },
  { id: "library", label: "Library", icon: Library, path: "/rw/library", shortcut: "L" },
];

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? "⌘" : "Ctrl";

export default function RedaimNavSidebar() {
  const { locale } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { workspaces, loading: wsLoading, createWorkspace, deleteWorkspace } = useRedaimWorkspaces();

  const [sharedExpanded, setSharedExpanded] = useState(true);
  const [privateExpanded, setPrivateExpanded] = useState(true);
  const [recentsExpanded, setRecentsExpanded] = useState(true);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Determine active nav from path
  const currentActive = (() => {
    const path = location.pathname;
    if (path.includes("/rw/search")) return "search";
    if (path.includes("/rw/meetings")) return "meetings";
    if (path.includes("/rw/ai")) return "ask-ai";
    if (path.includes("/rw/inbox")) return "inbox";
    if (path.includes("/rw/library")) return "library";
    const rwSegments = path.split("/rw/")[1];
    if (rwSegments && rwSegments.length > 10) return "";
    return "home";
  })();

  const { data: profileData } = useQuery({
    queryKey: ["rw-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
  const displayName = profileData?.display_name || profileData?.username || user?.email?.split("@")[0] || "";

  const { data: recentPages = [] } = useQuery({
    queryKey: ["rw-recent-pages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rw_pages" as any)
        .select("id, title, icon, workspace_id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(6);
      return (data as any[] || []).map((p) => ({
        id: p.id,
        title: p.title || "Untitled",
        icon: p.icon || "📄",
        workspace_id: p.workspace_id,
      })) as RecentPage[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const shortcutActions = useMemo(() => ({
    onCreateWorkspace: () => setCreateOpen(true),
  }), []);
  useRedaimShortcuts(shortcutActions);

  const [showShortcuts, setShowShortcuts] = useState(false);

  const toggleDarkMode = () => {
    const root = document.documentElement;
    if (isDark) root.classList.remove("dark");
    else root.classList.add("dark");
    setIsDark(!isDark);
  };

  const handleNavClick = (item: (typeof mainNav)[0]) => {
    if (item.id === "home") {
      navigate(`/${locale}/rw`);
    } else {
      navigate(`/${locale}${item.path}`);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const ws = await createWorkspace(newName.trim());
    if (ws) navigate(`/${locale}/rw/${(ws as any).id}`);
    setCreating(false);
    setCreateOpen(false);
    setNewName("");
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteConfirm) return;
    await deleteWorkspace(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const myWorkspaces = workspaces.filter((ws) => ws.owner_id === user?.id);
  const sharedWorkspaces = workspaces.filter((ws) => ws.owner_id !== user?.id);

  return (
    <aside className="rw-unified-sidebar" aria-label="Redaim Workspace Sidebar">
      <div className="rw-sidebar-user-header" style={{ position: "relative" }}>
        <button
          className="rw-sidebar-user-info focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          onClick={() => setSwitcherOpen(!switcherOpen)}
          aria-haspopup="true"
          aria-expanded={switcherOpen}
          aria-label="Workspace Switcher"
          style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
        >
          <div className="rw-sidebar-user-avatar">
            {displayName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <span className="rw-sidebar-user-name">
            {displayName ? `${displayName}'s R...` : "Redaim."}
          </span>
          <ChevronDown size={14} style={{ color: "var(--rw-text-muted)", flexShrink: 0 }} />
        </button>
        <button
          className="rw-sidebar-action-btn focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => navigate(`/${locale}/rw`)}
          title="Neuer Editor"
          aria-label="Neuer Editor"
        >
          <PenSquare size={16} />
        </button>

        {switcherOpen && (
          <>
            <div className="rw-switcher-backdrop" onClick={() => setSwitcherOpen(false)} />
            <div className="rw-switcher-dropdown" role="menu">
              <div className="rw-switcher-label" role="presentation">Workspaces</div>
              <ul className="list-none m-0 p-0">
                {workspaces.map((ws) => (
                  <li key={ws.id} role="none">
                    <button
                      className="rw-switcher-item w-full text-left"
                      role="menuitem"
                      onClick={() => {
                        navigate(`/${locale}/rw/${ws.id}`);
                        setSwitcherOpen(false);
                      }}
                    >
                      <TwemojiImg emoji={ws.icon || "📁"} size={16} />
                      <span>{ws.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="rw-switcher-divider" role="presentation" />
              <button
                className="rw-switcher-item w-full text-left"
                role="menuitem"
                onClick={() => {
                  setSwitcherOpen(false);
                  setCreateOpen(true);
                }}
              >
                <Plus size={15} />
                <span>Neuer Workspace</span>
              </button>
              <button
                className="rw-switcher-item w-full text-left"
                role="menuitem"
                onClick={() => {
                  setSwitcherOpen(false);
                  navigate(`/${locale}/rw`);
                }}
              >
                <Home size={15} />
                <span>Home</span>
              </button>
            </div>
          </>
        )}
      </div>

      <nav className="rw-sidebar-nav">
        <ul className="list-none m-0 p-0">
          {mainNav.map((item) => (
            <li key={item.id}>
              <button
                className={`rw-sidebar-nav-item w-full text-left ${currentActive === item.id ? "active" : ""}`}
                onClick={() => handleNavClick(item)}
                title={`${item.label} (${modKey}+${item.shortcut})`}
                aria-current={currentActive === item.id ? "page" : undefined}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                <kbd className="rw-shortcut-badge" aria-hidden="true">{modKey}+{item.shortcut}</kbd>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="rw-sidebar-scrollable">
        {recentPages.length > 0 && (
          <div className="rw-sidebar-group">
            <button
              className="rw-sidebar-group-header w-full text-left flex items-center justify-between"
              onClick={() => setRecentsExpanded(!recentsExpanded)}
              aria-expanded={recentsExpanded}
            >
              <span>Recents</span>
              {recentsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {recentsExpanded && (
              <ul className="rw-sidebar-group-items list-none m-0 p-0">
                {recentPages.map((page) => (
                  <li key={page.id}>
                    <button
                      className="rw-sidebar-page-item w-full text-left"
                      onClick={() => navigate(`/${locale}/rw/${page.workspace_id}/${page.id}`)}
                    >
                      <span className="rw-sidebar-page-icon"><TwemojiImg emoji={page.icon} size={16} /></span>
                      <span className="rw-sidebar-page-title">{page.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="rw-sidebar-group">
          <button
            className="rw-sidebar-group-header w-full text-left flex items-center justify-between"
            onClick={() => setSharedExpanded(!sharedExpanded)}
            aria-expanded={sharedExpanded}
          >
            <span>Shared</span>
            {sharedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {sharedExpanded && (
            <ul className="rw-sidebar-group-items list-none m-0 p-0">
              {sharedWorkspaces.map((ws) => (
                <li key={ws.id}>
                  <button
                    className="rw-sidebar-page-item w-full text-left"
                    onClick={() => navigate(`/${locale}/rw/${ws.id}`)}
                  >
                    <span className="rw-sidebar-page-icon"><TwemojiImg emoji={ws.icon} size={16} /></span>
                    <span className="rw-sidebar-page-title">{ws.name}</span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  className="rw-sidebar-page-item rw-sidebar-add-item w-full text-left"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus size={15} />
                  <span>Start collaborating</span>
                </button>
              </li>
            </ul>
          )}
        </div>

        <div className="rw-sidebar-group">
          <button
            className="rw-sidebar-group-header w-full text-left flex items-center justify-between"
            onClick={() => setPrivateExpanded(!privateExpanded)}
            aria-expanded={privateExpanded}
          >
            <span>Private</span>
            {privateExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {privateExpanded && (
            <ul className="rw-sidebar-group-items list-none m-0 p-0">
              {myWorkspaces.map((ws) => (
                <li key={ws.id} className="rw-sidebar-page-item-wrapper group">
                  <button
                    className="rw-sidebar-page-item flex-1 text-left"
                    onClick={() => navigate(`/${locale}/rw/${ws.id}`)}
                  >
                    <span className="rw-sidebar-page-icon"><TwemojiImg emoji={ws.icon} size={16} /></span>
                    <span className="rw-sidebar-page-title">{ws.name}</span>
                  </button>
                  <button
                    className="rw-sidebar-item-delete opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm({ id: ws.id, name: ws.name });
                    }}
                    title="Löschen"
                    aria-label={`Löschen ${ws.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
              <li>
                <button
                  className="rw-sidebar-page-item rw-sidebar-add-item w-full text-left"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus size={15} />
                  <span>Neue Seite</span>
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="rw-sidebar-bottom">
        <button className="rw-sidebar-nav-item w-full text-left" onClick={() => navigate(`/${locale}/rw/settings`)}>
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button className="rw-sidebar-nav-item w-full text-left" onClick={toggleDarkMode}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <div className="rw-sidebar-group" style={{ marginTop: 4 }}>
          <div className="rw-sidebar-group-header">
            <span>Quick Links</span>
          </div>
          <ul className="rw-sidebar-group-items list-none m-0 p-0">
            {([
              { name: "DuckDuckGo", url: "https://duckduckgo.com/", Icon: Globe },
              { name: "CritiCore", url: "https://criticore.cc/", Icon: Gamepad2 },
              { name: "Canva", url: "https://canva.com/", Icon: Palette },
              { name: "Proton Mail", url: "https://mail.proton.me/", Icon: Shield },
              { name: "Gmail", url: "https://gmail.com/", Icon: Mail },
              { name: "TGN News", url: "https://tgn.news/", Icon: Newspaper },
            ] as const).map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rw-sidebar-page-item rw-sidebar-quicklink flex items-center"
                >
                  <span className="rw-sidebar-page-icon"><link.Icon size={16} /></span>
                  <span className="rw-sidebar-page-title">{link.name}</span>
                  <ExternalLink size={11} style={{ color: "var(--rw-text-muted)", marginLeft: "auto", flexShrink: 0 }} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rw-sidebar-footer-icons">
        <button
          className="rw-sidebar-footer-btn focus-visible:ring-2 focus-visible:ring-primary"
          title="Shortcuts anzeigen"
          aria-label="Shortcuts anzeigen"
          onClick={() => setShowShortcuts(!showShortcuts)}
        >
          <Keyboard size={16} />
        </button>
        <span className="rw-sidebar-brand-mini">Redaim<span style={{ color: "var(--rw-accent)" }}>.</span></span>
      </div>

      {showShortcuts && (
        <>
          <div className="rw-switcher-backdrop" onClick={() => setShowShortcuts(false)} />
          <div className="rw-shortcuts-panel" role="dialog" aria-label="Keyboard Shortcuts">
            <div className="rw-shortcuts-title">
              <Keyboard size={14} /> Keyboard Shortcuts
            </div>
            {mainNav.map((item) => (
              <div key={item.id} className="rw-shortcuts-row">
                <span>{item.label}</span>
                <kbd className="rw-shortcut-key">{modKey}+{item.shortcut}</kbd>
              </div>
            ))}
            <div className="rw-switcher-divider" />
            <div className="rw-shortcuts-row">
              <span>Neuer Workspace</span>
              <kbd className="rw-shortcut-key">{modKey}+N</kbd>
            </div>
            <div className="rw-shortcuts-row">
              <span>Settings</span>
              <kbd className="rw-shortcut-key">{modKey}+,</kbd>
            </div>
            <div className="rw-shortcuts-row">
              <span>Dark/Light Mode</span>
              <kbd className="rw-shortcut-key">{modKey}+.</kbd>
            </div>
          </div>
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="redaim-dialog">
          <DialogHeader>
            <DialogTitle>Neuer Workspace</DialogTitle>
            <DialogDescription>Gib deinem Workspace einen Namen</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name..."
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
              <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? "Erstellt..." : "Erstellen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent className="redaim-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Workspace löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Bist du sicher? Der Workspace "{deleteConfirm?.name}" und alle darin enthaltenen Seiten werden unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWorkspace} className="bg-destructive text-destructive-foreground">
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
