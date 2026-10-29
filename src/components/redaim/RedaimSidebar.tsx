import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TwemojiImg from "./TwemojiImg";
import type { RwPage } from "@/hooks/useRedaimPages";
import { useRedaimMembers, useRedaimMyRole } from "@/hooks/useRedaimWorkspace";
import RedaimInviteDialog from "./RedaimInviteDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, ChevronRight, ChevronDown, ArrowLeft, Trash2, Sun, Moon, X } from "lucide-react";

interface Props {
  workspaceId: string;
  workspaceName: string;
  workspaceIcon: string;
  activePage?: string;
  pages: RwPage[];
  onCreatePage: () => Promise<void>;
  onDeletePage: (pageId: string) => Promise<void>;
  onCloseMobile?: () => void;
}

export default function RedaimSidebar({ workspaceId, workspaceName, workspaceIcon, activePage, pages, onCreatePage, onDeletePage, onCloseMobile }: Props) {
  const navigate = useNavigate();
  const { locale } = useParams();
  const { members } = useRedaimMembers(workspaceId);
  const myRole = useRedaimMyRole(workspaceId);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [membersExpanded, setMembersExpanded] = useState(false);
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);

  const rootPages = pages.filter((p) => !p.parent_id);
  const childPages = (parentId: string) => pages.filter((p) => p.parent_id === parentId);

  const toggleDarkMode = () => {
    const root = document.documentElement;
    if (isDark) root.classList.remove("dark");
    else root.classList.add("dark");
    setIsDark(!isDark);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handlePageClick = (pageId: string) => {
    navigate(`/${locale}/rw/${workspaceId}/${pageId}`);
    if (onCloseMobile) onCloseMobile();
  };

  const handleDragStart = useCallback((e: React.DragEvent, pageId: string) => {
    e.dataTransfer.setData("text/plain", pageId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingPageId(pageId);
  }, []);

  const handleDragEnd = useCallback(() => { setDraggingPageId(null); setDragOverZone(false); }, []);
  const handleZoneDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverZone(true); }, []);
  const handleZoneDragLeave = useCallback(() => { setDragOverZone(false); }, []);

  const handleZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const pageId = e.dataTransfer.getData("text/plain");
    setDragOverZone(false);
    setDraggingPageId(null);
    if (!pageId) return;
    const page = pages.find((p) => p.id === pageId);
    setConfirmDelete({ id: pageId, title: page?.title || "Untitled" });
  }, [pages]);

  const executeDelete = useCallback(async () => {
    if (!confirmDelete) return;
    const pageId = confirmDelete.id;
    if (activePage === pageId) {
      const remaining = pages.filter((p) => p.id !== pageId);
      if (remaining.length > 0) navigate(`/${locale}/rw/${workspaceId}/${remaining[0].id}`);
      else navigate(`/${locale}/rw/${workspaceId}`);
    }
    await onDeletePage(pageId);
    setConfirmDelete(null);
  }, [confirmDelete, activePage, pages, locale, workspaceId, navigate, onDeletePage]);

  const renderPage = (page: RwPage, depth = 0) => {
    const children = childPages(page.id);
    const isActive = activePage === page.id;
    const isExpanded = expanded.has(page.id);
    const isDragging = draggingPageId === page.id;

    return (
      <div key={page.id}>
        <div
          className={`redaim-sidebar-item ${isActive ? "active" : ""} ${isDragging ? "dragging" : ""}`}
          style={{ paddingLeft: `${10 + depth * 14}px` }}
          draggable
          onDragStart={(e) => handleDragStart(e, page.id)}
          onDragEnd={handleDragEnd}
        >
          {children.length > 0 && (
            <button type="button" className="redaim-expand-btn" onClick={() => toggleExpand(page.id)} aria-label={isExpanded ? "Unterseiten einklappen" : "Unterseiten ausklappen"} aria-expanded={isExpanded}>
              {isExpanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
            </button>
          )}
          <button type="button" className="redaim-page-link" onClick={() => handlePageClick(page.id)} aria-current={isActive ? "page" : undefined}>
            <span className="redaim-page-icon"><TwemojiImg emoji={page.icon || "📄"} size={16} /></span>
            <span className="redaim-page-title">{page.title || "Untitled"}</span>
          </button>
        </div>
        {isExpanded && children.map((c) => renderPage(c, depth + 1))}
      </div>
    );
  };

  const canDelete = myRole === "owner" || myRole === "user";

  return (
    <aside className={`redaim-sidebar ${onCloseMobile ? "mobile-open" : ""}`}>
      <div className="redaim-sidebar-header">
        <button className="redaim-back-btn" onClick={() => navigate(`/${locale}/rw`)}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 15 }}><TwemojiImg emoji={workspaceIcon || "📁"} size={18} /></span>
          <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {workspaceName}
          </span>
        </div>
        {onCloseMobile && (
          <button className="redaim-icon-btn lg:hidden ml-2" onClick={onCloseMobile}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="redaim-sidebar-section" style={{ flex: 1, overflow: "auto" }}>
        <div className="redaim-section-header">
          <span>Seiten</span>
          <button className="redaim-icon-btn" onClick={onCreatePage} title="Neue Seite">
            <Plus size={15} />
          </button>
        </div>
        <div className="redaim-page-tree">
          {rootPages.length === 0 && <p className="redaim-empty-text">Noch keine Seiten</p>}
          {rootPages.map((p) => renderPage(p))}
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="redaim-section-header clickable" onClick={() => setMembersExpanded(!membersExpanded)}>
            <span>Mitglieder</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--rw-text-muted)" }}>{members.length}</span>
              {membersExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          </button>
          {membersExpanded && (
            <div className="redaim-member-list">
              {members.map((m) => (
                <div key={m.id} className="redaim-member-item">
                  <div className="redaim-member-avatar">
                    {m.profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="redaim-member-info">
                    <span className="redaim-member-name">{m.profile?.display_name || "Unbekannt"}</span>
                    <span className="redaim-member-role">{m.role}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {myRole === "owner" && (
            <button className="redaim-invite-btn" onClick={() => setInviteOpen(true)}>
              <Plus size={13} /> Einladen
            </button>
          )}
        </div>
      </div>

      {canDelete && (
        <div
          className={`redaim-danger-zone ${draggingPageId ? "visible" : ""} ${dragOverZone ? "active" : ""}`}
          onDragOver={handleZoneDragOver}
          onDragLeave={handleZoneDragLeave}
          onDrop={handleZoneDrop}
        >
          <Trash2 size={16} />
          <span>Zum Löschen hierher ziehen</span>
        </div>
      )}

      <div className="redaim-sidebar-footer">
        <span className="redaim-brand">Redaim<span className="redaim-brand-dot">.</span></span>
        <button className="redaim-theme-toggle" onClick={toggleDarkMode} title={isDark ? "Light Mode" : "Dark Mode"}>
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      <RedaimInviteDialog workspaceId={workspaceId} open={inviteOpen} onOpenChange={setInviteOpen} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent className="redaim-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Seite löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du „{confirmDelete?.title || "Untitled"}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
