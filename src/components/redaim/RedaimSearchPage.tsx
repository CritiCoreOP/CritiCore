import { useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import RedaimNavSidebar from "./RedaimNavSidebar";

interface SearchResult {
  id: string;
  title: string;
  workspace_name: string;
  workspace_id: string;
  icon: string;
}

export default function RedaimSearch() {
  const { user } = useAuth();
  const { locale } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || !user) return;
    setSearching(true);
    setSearched(true);

    const { data: pages } = await supabase
      .from("rw_pages" as any)
      .select("id, title, icon, workspace_id")
      .ilike("title", `%${query.trim()}%`)
      .limit(20);

    if (pages && pages.length > 0) {
      const wsIds = [...new Set((pages as any[]).map((p: any) => p.workspace_id))];
      const { data: workspaces } = await supabase
        .from("rw_workspaces" as any)
        .select("id, name")
        .in("id", wsIds);

      const wsMap = new Map((workspaces as any[] || []).map((w: any) => [w.id, w.name]));

      setResults(
        (pages as any[]).map((p: any) => ({
          id: p.id,
          title: p.title || "Untitled",
          workspace_name: wsMap.get(p.workspace_id) || "Workspace",
          workspace_id: p.workspace_id,
          icon: p.icon || "📄",
        }))
      );
    } else {
      setResults([]);
    }
    setSearching(false);
  };

  return (
    <div className="redaim-workspace">
      <RedaimNavSidebar />
      <div className="redaim-subpage">
        <h1 className="redaim-subpage-title">Search</h1>
        <p className="redaim-subpage-desc">Durchsuche deine Workspaces und Seiten</p>

        <div className="redaim-search-bar">
          <SearchIcon size={18} className="redaim-search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Seiten durchsuchen..."
            className="redaim-search-input"
            autoFocus
          />
          {query && (
            <button className="redaim-search-clear" onClick={() => { setQuery(""); setResults([]); setSearched(false); }}>
              <X size={16} />
            </button>
          )}
        </div>

        {searching && (
          <div className="redaim-loading" style={{ padding: "40px 0" }}>
            <div className="redaim-spinner" />
          </div>
        )}

        {!searching && searched && results.length === 0 && (
          <div className="redaim-empty-state" style={{ paddingTop: 40 }}>
            <SearchIcon size={40} />
            <p>Keine Ergebnisse für „{query}"</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="redaim-search-results">
            {results.map((r) => (
              <button
                key={r.id}
                className="redaim-search-result-item"
                onClick={() => navigate(`/${locale}/rw/${r.workspace_id}/${r.id}`)}
              >
                <span className="redaim-search-result-icon">{r.icon}</span>
                <div className="redaim-search-result-info">
                  <span className="redaim-search-result-title">{r.title}</span>
                  <span className="redaim-search-result-ws">{r.workspace_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
