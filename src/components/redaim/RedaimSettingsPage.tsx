import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Settings, Users, Trash2, Save, LogOut, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRedaimWorkspaces, useRedaimMembers } from "@/hooks/useRedaimWorkspace";
import RedaimNavSidebar from "./RedaimNavSidebar";
import TwemojiImg from "./TwemojiImg";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Tab = "workspace" | "personal";

export default function RedaimSettingsPage() {
  const { locale } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaces, deleteWorkspace } = useRedaimWorkspaces();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("workspace");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const ws = workspaces[0];
  const { members } = useRedaimMembers(ws?.id);

  // Workspace settings state
  const [wsName, setWsName] = useState("");
  const [wsIcon, setWsIcon] = useState("");
  const [wsLoaded, setWsLoaded] = useState(false);

  // Personal settings state
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("rw-font-size") || "14");
  const [autoSaveDelay, setAutoSaveDelay] = useState(() => localStorage.getItem("rw-autosave") || "3000");

  // Load workspace info
  useQuery({
    queryKey: ["rw-settings-ws", ws?.id],
    queryFn: async () => {
      if (!ws) return null;
      setWsName(ws.name);
      setWsIcon(ws.icon || "📁");
      setWsLoaded(true);
      return ws;
    },
    enabled: !!ws && !wsLoaded,
  });

  const updateWsMutation = useMutation({
    mutationFn: async () => {
      if (!ws) return;
      await supabase
        .from("rw_workspaces" as any)
        .update({ name: wsName, icon: wsIcon } as any)
        .eq("id", ws.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rw-workspaces"] }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await supabase.from("rw_members" as any).delete().eq("id", memberId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rw-members"] }),
  });

  const handleDeleteWorkspace = async () => {
    if (!ws) return;
    await deleteWorkspace(ws.id);
    navigate(`/${locale}/rw`);
  };

  const savePersonal = () => {
    localStorage.setItem("rw-font-size", fontSize);
    localStorage.setItem("rw-autosave", autoSaveDelay);
  };

  const isOwner = ws && members.some((m) => m.user_id === user?.id && m.role === "owner");

  if (!user) {
    return (
      <div className="redaim-workspace">
        <RedaimNavSidebar />
        <div className="redaim-subpage">
          <div className="redaim-empty-state">
            <p>Bitte melde dich an.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="redaim-workspace">
      <RedaimNavSidebar />
      <div className="redaim-subpage">
        <div className="redaim-subpage-header">
          <div>
            <h1 className="redaim-subpage-title">Settings</h1>
            <p className="redaim-subpage-desc">Workspace- & persönliche Einstellungen</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="rw-settings-tabs">
          <button
            className={`rw-settings-tab${tab === "workspace" ? " active" : ""}`}
            onClick={() => setTab("workspace")}
          >
            <Settings size={14} /> Workspace
          </button>
          <button
            className={`rw-settings-tab${tab === "personal" ? " active" : ""}`}
            onClick={() => setTab("personal")}
          >
            <Pencil size={14} /> Persönlich
          </button>
        </div>

        {/* Workspace Tab */}
        {tab === "workspace" && (
          <div className="rw-settings-section">
            {!ws ? (
              <div className="redaim-empty-state">
                <p>Kein Workspace vorhanden</p>
              </div>
            ) : (
              <>
                {/* Name & Icon */}
                <div className="rw-settings-card">
                  <h3 className="rw-settings-card-title">Workspace</h3>
                  <div className="rw-settings-field">
                    <label className="rw-settings-label">Icon</label>
                    <div className="rw-settings-icon-row">
                      <span className="rw-settings-icon-preview">
                        <TwemojiImg emoji={wsIcon} size={28} />
                      </span>
                      <input
                        className="rw-meeting-input"
                        value={wsIcon}
                        onChange={(e) => setWsIcon(e.target.value)}
                        maxLength={4}
                        style={{ width: 60, textAlign: "center" }}
                      />
                    </div>
                  </div>
                  <div className="rw-settings-field">
                    <label className="rw-settings-label">Name</label>
                    <input
                      className="rw-meeting-input"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      placeholder="Workspace-Name"
                      disabled={!isOwner}
                    />
                  </div>
                  {isOwner && (
                    <button
                      className="redaim-create-btn"
                      onClick={() => updateWsMutation.mutate()}
                      disabled={updateWsMutation.isPending}
                      style={{ alignSelf: "flex-start", marginTop: 8 }}
                    >
                      <Save size={14} /> Speichern
                    </button>
                  )}
                </div>

                {/* Members */}
                <div className="rw-settings-card">
                  <h3 className="rw-settings-card-title">
                    <Users size={15} /> Mitglieder ({members.length})
                  </h3>
                  <div className="rw-settings-members">
                    {members.map((m) => (
                      <div key={m.id} className="rw-settings-member">
                        <div className="rw-settings-member-info">
                          {m.profile?.avatar_url ? (
                            <img src={m.profile.avatar_url} alt="" className="rw-settings-member-avatar" />
                          ) : (
                            <div className="rw-settings-member-avatar rw-settings-member-avatar-fallback">
                              {(m.profile?.display_name || "?")[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="rw-settings-member-name">
                              {m.profile?.display_name || "Unbekannt"}
                            </span>
                            <span className="rw-settings-member-role">{m.role}</span>
                          </div>
                        </div>
                        {isOwner && m.user_id !== user?.id && (
                          <button
                            className="rw-meeting-action-btn rw-meeting-action-delete"
                            onClick={() => removeMemberMutation.mutate(m.id)}
                            title="Entfernen"
                          >
                            <LogOut size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Danger Zone */}
                {isOwner && (
                  <div className="rw-settings-card rw-settings-danger">
                    <h3 className="rw-settings-card-title">Gefahrenzone</h3>
                    <p className="rw-settings-danger-text">
                      Das Löschen des Workspaces ist unwiderruflich. Alle Seiten und Daten werden gelöscht.
                    </p>
                    <button
                      className="rw-settings-danger-btn"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 size={14} /> Workspace löschen
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Personal Tab */}
        {tab === "personal" && (
          <div className="rw-settings-section">
            <div className="rw-settings-card">
              <h3 className="rw-settings-card-title">Editor</h3>
              <div className="rw-settings-field">
                <label className="rw-settings-label">Schriftgröße (px)</label>
                <input
                  type="number"
                  className="rw-meeting-input"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  min={10}
                  max={24}
                  style={{ width: 80 }}
                />
              </div>
              <div className="rw-settings-field">
                <label className="rw-settings-label">Auto-Save Verzögerung (ms)</label>
                <select
                  className="rw-meeting-input"
                  value={autoSaveDelay}
                  onChange={(e) => setAutoSaveDelay(e.target.value)}
                  style={{ width: 140 }}
                >
                  <option value="1000">1 Sekunde</option>
                  <option value="2000">2 Sekunden</option>
                  <option value="3000">3 Sekunden</option>
                  <option value="5000">5 Sekunden</option>
                </select>
              </div>
              <button
                className="redaim-create-btn"
                onClick={savePersonal}
                style={{ alignSelf: "flex-start", marginTop: 8 }}
              >
                <Save size={14} /> Speichern
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Workspace löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Alle Seiten, Mitglieder und Daten werden unwiderruflich gelöscht.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteWorkspace}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Endgültig löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
