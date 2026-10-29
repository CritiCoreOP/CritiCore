import { useState } from "react";
import { useParams } from "react-router-dom";
import { Video, Plus, Calendar, Clock, Trash2, Edit2, X, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRedaimWorkspaces } from "@/hooks/useRedaimWorkspace";
import RedaimNavSidebar from "./RedaimNavSidebar";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Meeting {
  id: string;
  workspace_id: string | null;
  title: string;
  description: string | null;
  meeting_date: string;
  meeting_time: string;
  duration_minutes: number;
  created_by: string;
  created_at: string;
}

interface MeetingForm {
  title: string;
  description: string;
  meeting_date: string;
  meeting_time: string;
  duration_minutes: number;
}

const EMPTY_FORM: MeetingForm = {
  title: "",
  description: "",
  meeting_date: format(new Date(), "yyyy-MM-dd"),
  meeting_time: "10:00",
  duration_minutes: 60,
};

export default function RedaimMeetingsPage() {
  const { user } = useAuth();
  const { workspaces } = useRedaimWorkspaces();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MeetingForm>(EMPTY_FORM);

  const wsId = workspaces[0]?.id;

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["rw-meetings", wsId, user?.id],
    queryFn: async () => {
      let q = supabase
        .from("rw_meetings" as any)
        .select("*")
        .order("meeting_date", { ascending: true })
        .order("meeting_time", { ascending: true });
      if (wsId) q = q.eq("workspace_id", wsId);
      const { data } = await q;
      return (data as any as Meeting[]) || [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (f: MeetingForm) => {
      const { error } = await supabase.from("rw_meetings" as any).insert({
        workspace_id: wsId || null,
        title: f.title,
        description: f.description || null,
        meeting_date: f.meeting_date,
        meeting_time: f.meeting_time,
        duration_minutes: f.duration_minutes,
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rw-meetings"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: MeetingForm }) => {
      const { error } = await supabase
        .from("rw_meetings" as any)
        .update({
          title: f.title,
          description: f.description || null,
          meeting_date: f.meeting_date,
          meeting_time: f.meeting_time,
          duration_minutes: f.duration_minutes,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rw-meetings"] });
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("rw_meetings" as any).delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rw-meetings"] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, f: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const startEdit = (m: Meeting) => {
    setEditingId(m.id);
    setForm({
      title: m.title,
      description: m.description || "",
      meeting_date: m.meeting_date,
      meeting_time: m.meeting_time,
      duration_minutes: m.duration_minutes,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const formatDate = (d: string) => {
    try {
      return format(new Date(d), "EEEE, dd. MMMM yyyy", { locale: de });
    } catch {
      return d;
    }
  };

  const formatTime = (t: string) => t?.slice(0, 5) || t;

  // Split into upcoming & past
  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = meetings.filter((m) => m.meeting_date >= today);
  const past = meetings.filter((m) => m.meeting_date < today);

  return (
    <div className="redaim-workspace">
      <RedaimNavSidebar />
      <div className="redaim-subpage">
        <div className="redaim-subpage-header">
          <div>
            <h1 className="redaim-subpage-title">Meetings</h1>
            <p className="redaim-subpage-desc">Plane und verwalte Team-Meetings</p>
          </div>
          {user && (
            <button
              className="redaim-create-btn"
              onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
            >
              <Plus size={16} /> Neues Meeting
            </button>
          )}
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <form className="rw-meeting-form" onSubmit={handleSubmit}>
            <div className="rw-meeting-form-header">
              <span>{editingId ? "Meeting bearbeiten" : "Neues Meeting"}</span>
              <button type="button" className="rw-meeting-form-close" onClick={cancelForm}>
                <X size={16} />
              </button>
            </div>
            <input
              className="rw-meeting-input"
              placeholder="Meeting-Titel *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
              required
            />
            <textarea
              className="rw-meeting-input rw-meeting-textarea"
              placeholder="Beschreibung (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
            <div className="rw-meeting-form-row">
              <label className="rw-meeting-field">
                <Calendar size={14} />
                <input
                  type="date"
                  className="rw-meeting-input"
                  value={form.meeting_date}
                  onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
                  required
                />
              </label>
              <label className="rw-meeting-field">
                <Clock size={14} />
                <input
                  type="time"
                  className="rw-meeting-input"
                  value={form.meeting_time}
                  onChange={(e) => setForm({ ...form, meeting_time: e.target.value })}
                  required
                />
              </label>
              <label className="rw-meeting-field">
                <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>Min.</span>
                <input
                  type="number"
                  className="rw-meeting-input"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                  min={5}
                  max={480}
                  style={{ width: 70 }}
                />
              </label>
            </div>
            <div className="rw-meeting-form-actions">
              <button type="button" className="rw-meeting-btn-cancel" onClick={cancelForm}>Abbrechen</button>
              <button
                type="submit"
                className="redaim-create-btn"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Check size={14} /> {editingId ? "Speichern" : "Erstellen"}
              </button>
            </div>
          </form>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="redaim-empty-state">
            <div className="rw-spinner" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && meetings.length === 0 && !showForm && (
          <div className="redaim-empty-state">
            <Video size={48} />
            <p>Noch keine Meetings geplant</p>
            <p className="redaim-text-muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
              Erstelle ein Meeting, um mit deinem Team zusammenzuarbeiten
            </p>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section className="rw-meeting-section">
            <h2 className="rw-meeting-section-title">Anstehend</h2>
            <div className="rw-meeting-list">
              {upcoming.map((m) => (
                <MeetingCard
                  key={m.id}
                  meeting={m}
                  isOwner={m.created_by === user?.id}
                  onEdit={() => startEdit(m)}
                  onDelete={() => deleteMutation.mutate(m.id)}
                  formatDate={formatDate}
                  formatTime={formatTime}
                />
              ))}
            </div>
          </section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section className="rw-meeting-section">
            <h2 className="rw-meeting-section-title" style={{ opacity: 0.6 }}>Vergangen</h2>
            <div className="rw-meeting-list">
              {past.map((m) => (
                <MeetingCard
                  key={m.id}
                  meeting={m}
                  isOwner={m.created_by === user?.id}
                  onEdit={() => startEdit(m)}
                  onDelete={() => deleteMutation.mutate(m.id)}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  past
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function MeetingCard({
  meeting: m,
  isOwner,
  onEdit,
  onDelete,
  formatDate,
  formatTime,
  past,
}: {
  meeting: Meeting;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  formatDate: (d: string) => string;
  formatTime: (t: string) => string;
  past?: boolean;
}) {
  return (
    <div className={`rw-meeting-card${past ? " rw-meeting-past" : ""}`}>
      <div className="rw-meeting-card-left">
        <div className="rw-meeting-card-icon">
          <Video size={18} />
        </div>
        <div className="rw-meeting-card-info">
          <span className="rw-meeting-card-title">{m.title}</span>
          {m.description && <span className="rw-meeting-card-desc">{m.description}</span>}
          <div className="rw-meeting-card-meta">
            <span><Calendar size={12} /> {formatDate(m.meeting_date)}</span>
            <span><Clock size={12} /> {formatTime(m.meeting_time)} Uhr</span>
            <span>{m.duration_minutes} Min.</span>
          </div>
        </div>
      </div>
      {isOwner && (
        <div className="rw-meeting-card-actions">
          <button className="rw-meeting-action-btn" onClick={onEdit} title="Bearbeiten">
            <Edit2 size={14} />
          </button>
          <button className="rw-meeting-action-btn rw-meeting-action-delete" onClick={onDelete} title="Löschen">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
