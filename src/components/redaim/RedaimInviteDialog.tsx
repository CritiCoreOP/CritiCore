import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentLocale, getLocaleFromPath } from "@/lib/localeRouting";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RedaimInviteDialog({ workspaceId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "press">("user");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const createInvite = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("create_rw_invite" as any, {
      p_workspace_id: workspaceId,
      p_role: role,
      p_email: email || null,
    });

    const result = data as any;
    if (error || !result?.success) {
      toast({ title: "Fehler", description: "Einladung konnte nicht erstellt werden.", variant: "destructive" });
    } else {
      const token = result.token;
      const locale = getLocaleFromPath(window.location.pathname) || getCurrentLocale();
      const link = `${window.location.origin}/${locale}/rw/invite/${token}`;
      setInviteLink(link);
    }
    setLoading(false);
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="redaim-dialog">
        <DialogHeader>
          <DialogTitle>Mitglied einladen</DialogTitle>
          <DialogDescription>Per E-Mail oder Link einladen</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium redaim-text-muted">E-Mail (optional)</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="redaim-input mt-1" />
          </div>

          <div>
            <label className="text-sm font-medium redaim-text-muted">Rolle</label>
            <div className="flex gap-2 mt-1">
              <button
                className={`redaim-role-btn ${role === "user" ? "active" : ""}`}
                onClick={() => setRole("user")}
              >
                User
              </button>
              <button
                className={`redaim-role-btn ${role === "press" ? "active" : ""}`}
                onClick={() => setRole("press")}
              >
                Presse
              </button>
            </div>
          </div>

          {!inviteLink ? (
            <Button onClick={createInvite} disabled={loading} className="w-full redaim-btn-primary">
              {loading ? "Erstelle..." : "Einladung erstellen"}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input value={inviteLink} readOnly className="redaim-input text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
              <p className="text-xs redaim-text-muted">Link gültig für 7 Tage</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
