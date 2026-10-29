import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRedaimPages, type RwPage } from "@/hooks/useRedaimPages";
import { useRedaimMyRole, type RwWorkspace } from "@/hooks/useRedaimWorkspace";
import RedaimSidebar from "./RedaimSidebar";
import RedaimEditor from "./RedaimEditor";
import RedaimPublishDialog from "./RedaimPublishDialog";
import RedaimAIChat from "./RedaimAIChat";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function RedaimLayout() {
  const { locale, workspaceId, pageId } = useParams<{ locale: string; workspaceId: string; pageId?: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<RwWorkspace | null>(null);
  const { pages, loading: pagesLoading, createPage, deletePage } = useRedaimPages(workspaceId);
  const myRole = useRedaimMyRole(workspaceId);
  const [publishOpen, setPublishOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Fetch workspace details
  useEffect(() => {
    if (!workspaceId) return;
    supabase
      .from("rw_workspaces" as any)
      .select("*")
      .eq("id", workspaceId)
      .single()
      .then(({ data }) => setWorkspace(data as any));
  }, [workspaceId]);

  // Auto-redirect to first page if none selected
  useEffect(() => {
    if (!pageId && pages.length > 0 && workspaceId) {
      navigate(`/${locale}/rw/${workspaceId}/${pages[0].id}`, { replace: true });
    }
  }, [pageId, pages, workspaceId, locale, navigate]);

  // Auto-create first page if workspace is empty
  const [autoCreated, setAutoCreated] = useState(false);
  useEffect(() => {
    if (!pagesLoading && !autoCreated && pages.length === 0 && workspaceId && myRole && myRole !== "press") {
      setAutoCreated(true);
      createPage("Willkommen");
    }
  }, [pagesLoading, pages.length, workspaceId, myRole, autoCreated]);

  const handleCreatePage = useCallback(async () => {
    const page = await createPage();
    if (page) navigate(`/${locale}/rw/${workspaceId}/${page.id}`);
    setSidebarOpen(false);
  }, [createPage, navigate, locale, workspaceId]);

  const handleDeletePage = useCallback(async (pageId: string) => {
    await deletePage(pageId);
  }, [deletePage]);

  const activePage: RwPage | undefined = pages.find((p) => p.id === pageId);
  const isReadOnly = myRole === "press";

  if (!workspace) {
    return (
      <div className="redaim-workspace redaim-loading-full">
        <div className="redaim-spinner" />
      </div>
    );
  }

  return (
    <div className="redaim-workspace">
      {isMobile && (
        <button 
          type="button"
          className="fixed bottom-6 left-6 z-[1001] flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Menü öffnen"
          aria-expanded={sidebarOpen}
        >
          <Menu size={24} /><span className="sr-only">Menü öffnen</span>
        </button>
      )}

      {isMobile && sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Menü schließen"
        />
      )}

      <div className={sidebarOpen ? "mobile-open" : ""}>
        <RedaimSidebar
          workspaceId={workspaceId!}
          workspaceName={workspace.name}
          workspaceIcon={workspace.icon}
          activePage={pageId}
          pages={pages}
          onCreatePage={handleCreatePage}
          onDeletePage={handleDeletePage}
          onCloseMobile={() => setSidebarOpen(false)}
        />
      </div>

      <main className="redaim-main">
        {activePage ? (
          <RedaimEditor
            page={activePage}
            readOnly={isReadOnly}
            onPublish={!isReadOnly ? () => setPublishOpen(true) : undefined}
          />
        ) : (
          <div className="redaim-empty-editor">
            <p className="redaim-text-muted">Wähle eine Seite aus der Seitenleiste</p>
          </div>
        )}
      </main>

      {activePage && (
        <RedaimPublishDialog
          page={activePage}
          workspaceId={workspaceId!}
          open={publishOpen}
          onOpenChange={setPublishOpen}
        />
      )}

      <RedaimAIChat />
    </div>
  );
}
