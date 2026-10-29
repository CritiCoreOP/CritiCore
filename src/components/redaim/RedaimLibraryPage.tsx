import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Library as LibraryIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import RedaimNavSidebar from "./RedaimNavSidebar";

interface LibraryItem {
  id: string;
  title: string;
  icon: string;
  workspace_id: string;
  workspace_name: string;
  updated_at: string;
}

export default function RedaimLibraryPage() {
  const { locale } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const loadLibrary = async () => {
      const { data: memberships } = await supabase
        .from("rw_members" as any)
        .select("workspace_id")
        .eq("user_id", user.id);

      if (!memberships || memberships.length === 0) {
        setLoading(false);
        return;
      }

      const wsIds = (memberships as any[]).map((m: any) => m.workspace_id);

      const { data: workspaces } = await supabase
        .from("rw_workspaces" as any)
        .select("id, name")
        .in("id", wsIds);

      const { data: pages } = await supabase
        .from("rw_pages" as any)
        .select("id, title, icon, workspace_id, updated_at")
        .in("workspace_id", wsIds)
        .order("updated_at", { ascending: false })
        .limit(50);

      const wsMap = new Map((workspaces as any[] || []).map((w: any) => [w.id, w.name]));

      setItems(
        (pages as any[] || []).map((p: any) => ({
          id: p.id,
          title: p.title || "Untitled",
          icon: p.icon || "📄",
          workspace_id: p.workspace_id,
          workspace_name: wsMap.get(p.workspace_id) || "Workspace",
          updated_at: new Date(p.updated_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
        }))
      );
      setLoading(false);
    };

    loadLibrary();
  }, [user]);

  return (
    <div className="redaim-workspace">
      <RedaimNavSidebar />
      <div className="redaim-subpage">
        <h1 className="redaim-subpage-title">Library</h1>
        <p className="redaim-subpage-desc">Alle deine Seiten an einem Ort</p>

        {loading ? (
          <div className="redaim-loading" style={{ padding: "40px 0" }}>
            <div className="redaim-spinner" />
          </div>
        ) : items.length === 0 ? (
          <div className="redaim-empty-state">
            <LibraryIcon size={48} />
            <p>Deine Library ist noch leer</p>
            <p className="redaim-text-muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
              Erstelle Seiten in deinen Workspaces, um sie hier zu sehen
            </p>
          </div>
        ) : (
          <div className="redaim-library-list">
            {items.map((item) => (
              <button
                key={item.id}
                className="redaim-library-item"
                onClick={() => navigate(`/${locale}/rw/${item.workspace_id}/${item.id}`)}
              >
                <span className="redaim-library-icon">{item.icon}</span>
                <div className="redaim-library-info">
                  <span className="redaim-library-title">{item.title}</span>
                  <span className="redaim-library-meta">{item.workspace_name} · {item.updated_at}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
