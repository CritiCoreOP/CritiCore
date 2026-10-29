import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Inbox as InboxIcon, Bell, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import RedaimNavSidebar from "./RedaimNavSidebar";

interface InboxItem {
  id: string;
  type: "invite" | "mention" | "update";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

export default function RedaimInboxPage() {
  const { locale } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const loadInbox = async () => {
      const { data: invites } = await supabase
        .from("rw_invites" as any)
        .select("id, workspace_id, role, created_at")
        .eq("email", user.email)
        .eq("accepted", false);

      const inboxItems: InboxItem[] = (invites as any[] || []).map((inv: any) => ({
        id: inv.id,
        type: "invite" as const,
        title: "Workspace-Einladung",
        description: `Du wurdest als ${inv.role} eingeladen`,
        time: new Date(inv.created_at).toLocaleDateString("de-DE"),
        read: false,
      }));

      setItems(inboxItems);
      setLoading(false);
    };

    loadInbox();
  }, [user]);

  return (
    <div className="redaim-workspace">
      <RedaimNavSidebar />
      <div className="redaim-subpage">
        <h1 className="redaim-subpage-title">Inbox</h1>
        <p className="redaim-subpage-desc">Benachrichtigungen und Einladungen</p>

        {loading ? (
          <div className="redaim-loading" style={{ padding: "40px 0" }}>
            <div className="redaim-spinner" />
          </div>
        ) : items.length === 0 ? (
          <div className="redaim-empty-state">
            <InboxIcon size={48} />
            <p>Keine neuen Benachrichtigungen</p>
            <p className="redaim-text-muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
              Einladungen und Updates erscheinen hier
            </p>
          </div>
        ) : (
          <div className="redaim-inbox-list">
            {items.map((item) => (
              <div key={item.id} className={`redaim-inbox-item ${item.read ? "read" : ""}`}>
                <div className="redaim-inbox-icon">
                  {item.type === "invite" ? <Bell size={16} /> : <Check size={16} />}
                </div>
                <div className="redaim-inbox-content">
                  <span className="redaim-inbox-title">{item.title}</span>
                  <span className="redaim-inbox-desc">{item.description}</span>
                </div>
                <span className="redaim-inbox-time">{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
