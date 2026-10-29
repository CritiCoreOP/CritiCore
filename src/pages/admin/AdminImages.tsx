import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/locale";
import { XCircle as CancelTwoTone, CheckCircle2 as CheckCircleTwoTone, Trash as DeleteTwoTone, Image as ImageTwoTone, RefreshCw as RefreshTwoTone } from "lucide-react";

const AdminImages = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [images, setImages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("media_images")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    if (data) {
      setImages(data);
      // Fetch profiles for uploaders
      const userIds = [...new Set(data.map((i: any) => i.uploaded_by))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.user_id] = p.display_name || "User"; });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("media_images")
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(status === "approved" ? "Bild genehmigt" : "Bild abgelehnt");
      load();
    }
  };

  const deleteImage = async (img: any) => {
    await supabase.storage.from("media-images").remove([img.storage_path]);
    const { error } = await supabase.from("media_images").delete().eq("id", img.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Bild gelöscht");
      load();
    }
  };

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-600/20 text-green-400 border-0 text-xs">Genehmigt</Badge>;
    if (status === "rejected") return <Badge className="bg-red-600/20 text-red-400 border-0 text-xs">Abgelehnt</Badge>;
    return <Badge className="bg-yellow-600/20 text-yellow-400 border-0 text-xs">Ausstehend</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ImageTwoTone className="w-6 h-6 text-primary" />
          {t("admin.sidebar.images", "Bild-Uploads")}
        </h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Ausstehend</SelectItem>
              <SelectItem value="approved">Genehmigt</SelectItem>
              <SelectItem value="rejected">Abgelehnt</SelectItem>
              <SelectItem value="all">Alle</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load}>
            <RefreshTwoTone className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Vorschau</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Media</TableHead>
                <TableHead>Uploader</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Laden...
                  </TableCell>
                </TableRow>
              ) : images.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Keine Bilder gefunden
                  </TableCell>
                </TableRow>
              ) : (
                images.map((img) => {
                  const publicUrl = supabase.storage
                    .from("media-images")
                    .getPublicUrl(img.storage_path).data.publicUrl;
                  return (
                    <TableRow key={img.id}>
                      <TableCell>
                        <img
                          src={publicUrl}
                          alt="Upload"
                          className="w-20 h-12 object-cover rounded-lg border border-border/40"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {img.image_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="capitalize text-muted-foreground">{img.media_type}</span>
                        <span className="mx-1 text-muted-foreground/40">·</span>
                        <span className="font-mono text-xs">{img.media_id}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {profiles[img.uploaded_by] || img.uploaded_by.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(img.created_at)}
                      </TableCell>
                      <TableCell>{statusBadge(img.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {img.status === "pending" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-400 hover:text-green-300"
                                onClick={() => updateStatus(img.id, "approved")}
                                title="Genehmigen"
                              >
                                <CheckCircleTwoTone className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-400 hover:text-red-300"
                                onClick={() => updateStatus(img.id, "rejected")}
                                title="Ablehnen"
                              >
                                <CancelTwoTone className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteImage(img)}
                            title="Löschen"
                          >
                            <DeleteTwoTone className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminImages;
