import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, ARTICLE_IMAGE } from "@/lib/compressImage";
import { useAuth } from "@/hooks/useAuth";
import { getMovieImages, getSeriesImages, tmdbImage, type TmdbImageResult } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Upload, Image as ImageIcon, X, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface MediaImageGalleryProps {
  mediaId: string;
  mediaType: "movie" | "series";
  mediaTitle: string;
}

type ImageTab = "backdrops" | "posters" | "logos";

const MediaImageGallery = ({ mediaId, mediaType, mediaTitle }: MediaImageGalleryProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ImageTab>("backdrops");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<ImageTab>("backdrops");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // Fetch TMDB images
  const { data: tmdbImages, isLoading: tmdbLoading } = useQuery({
    queryKey: ["tmdb-images", mediaType, mediaId],
    queryFn: () => mediaType === "movie" ? getMovieImages(mediaId) : getSeriesImages(mediaId),
    staleTime: 1000 * 60 * 60,
  });

  // Fetch user-uploaded approved images
  const { data: userImages, refetch: refetchUserImages } = useQuery({
    queryKey: ["media-images", mediaId, mediaType],
    queryFn: async () => {
      const { data } = await supabase
        .from("media_images")
        .select("*")
        .eq("media_id", mediaId)
        .eq("media_type", mediaType)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const tabs: { key: ImageTab; label: string }[] = [
    { key: "backdrops", label: t("gallery.backdrops", "Backdrops") },
    { key: "posters", label: t("gallery.posters", "Posters") },
    { key: "logos", label: t("gallery.logos", "Logos") },
  ];

  const tmdbItems = tmdbImages?.[activeTab] || [];
  const userItems = (userImages || []).filter(
    (img: any) => img.image_type === activeTab.slice(0, -1) // "backdrops" -> "backdrop"
  );

  const getImageUrl = (item: TmdbImageResult) => {
    if (activeTab === "logos") return tmdbImage(item.file_path, "w500");
    if (activeTab === "posters") return tmdbImage(item.file_path, "w780");
    return tmdbImage(item.file_path, "w1280");
  };

  const getOriginalUrl = (item: TmdbImageResult) =>
    tmdbImage(item.file_path, "original");

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error(t("gallery.downloadError", "Download fehlgeschlagen"));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setUploading(true);
    try {
      const file = await compressImage(selectedFile, ARTICLE_IMAGE);
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${mediaType}-${mediaId}-${uploadType}-${Date.now()}.${ext}`;
      const { error: storageError } = await supabase.storage
        .from("media-images")
        .upload(path, file);

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from("media-images")
        .getPublicUrl(path);

      const { error: dbError } = await supabase.from("media_images").insert({
        media_id: mediaId,
        media_type: mediaType,
        image_type: uploadType.slice(0, -1), // "backdrops" -> "backdrop"
        storage_path: path,
        uploaded_by: user.id,
      });

      if (dbError) throw dbError;

      toast.success(t("gallery.uploadSuccess", "Bild hochgeladen! Wird nach Admin-Prüfung angezeigt."));
      setUploadOpen(false);
      setSelectedFile(null);
      refetchUserImages();
    } catch (err: any) {
      toast.error(err.message || t("gallery.uploadError", "Upload fehlgeschlagen"));
    } finally {
      setUploading(false);
    }
  };

  if (tmdbLoading) {
    return (
      <section>
        <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-primary inline-block" />
          {t("gallery.title", "Bilder")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-primary inline-block" />
          {t("gallery.title", "Bilder")}
        </h2>
        {user && (
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Upload className="w-3.5 h-3.5" />
                {t("gallery.upload", "Hochladen")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("gallery.uploadTitle", "Bild hochladen")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("gallery.uploadNote", "Bilder werden nach einer Admin-Prüfung sichtbar.")}
                </p>
                <Select value={uploadType} onValueChange={(v) => setUploadType(v as ImageTab)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backdrops">Backdrop</SelectItem>
                    <SelectItem value="posters">Poster</SelectItem>
                    <SelectItem value="logos">Logo</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                {selectedFile && (
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    width={320}
                    height={192}
                    className="max-h-48 rounded-lg object-contain mx-auto"
                  />
                )}
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="w-full"
                >
                  {uploading ? "..." : t("gallery.submitUpload", "Hochladen")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map((tab) => {
          const count = (tmdbImages?.[tab.key]?.length || 0) + 
            (userImages || []).filter((img: any) => img.image_type === tab.key.slice(0, -1) && img.status === "approved").length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Image grid */}
      <div className={`grid gap-3 ${activeTab === "posters" ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6" : activeTab === "logos" ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"}`}>
        {/* TMDB images */}
        {tmdbItems.map((item, i) => (
          <div
            key={`tmdb-${i}`}
            className="group relative overflow-hidden rounded-lg border border-border/40 bg-card"
          >
            <button
              type="button"
              className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={() => setPreviewImg(getOriginalUrl(item)!)}
              aria-label={t("gallery.openPreview", "Bildvorschau öffnen")}
            >
              <img
                src={getImageUrl(item)!}
                alt={`${mediaTitle} ${activeTab} ${i + 1}`}
                width={item.width || 1280}
                height={item.height || 720}
                className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                  activeTab === "posters" ? "aspect-[2/3]" : activeTab === "logos" ? "aspect-[2/1] object-contain bg-secondary p-2" : "aspect-video"
                }`}
                loading="lazy"
              />
            </button>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/0 opacity-0 transition-[background-color,opacity] group-hover:bg-background/40 group-hover:opacity-100 group-focus-within:bg-background/40 group-focus-within:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(getOriginalUrl(item)!, `${mediaTitle}-${activeTab}-${i + 1}.jpg`);
                }}
                className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("gallery.download", "Bild herunterladen")}
              >
                <Download className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="absolute top-2 left-2">
              <Badge className="bg-background/70 backdrop-blur-sm text-[9px] text-foreground/80 border-0">
                TMDB
              </Badge>
            </div>
            <div className="absolute bottom-2 right-2 text-[9px] text-white/70 bg-black/50 rounded px-1.5 py-0.5 backdrop-blur-sm">
              {item.width}×{item.height}
            </div>
          </div>
        ))}

        {/* User-uploaded approved images */}
        {userItems
          .filter((img: any) => img.status === "approved")
          .map((img: any) => {
            const publicUrl = supabase.storage.from("media-images").getPublicUrl(img.storage_path).data.publicUrl;
            return (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded-lg border border-border/40 bg-card"
              >
                <button type="button" className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onClick={() => setPreviewImg(publicUrl)} aria-label={t("gallery.openPreview", "Bildvorschau öffnen")}>
                  <img
                    src={publicUrl}
                    alt={`${mediaTitle} ${img.image_type}`}
                    width={activeTab === "posters" ? 600 : activeTab === "logos" ? 1200 : 1280}
                    height={activeTab === "posters" ? 900 : activeTab === "logos" ? 600 : 720}
                    className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                      activeTab === "posters" ? "aspect-[2/3]" : activeTab === "logos" ? "aspect-[2/1] object-contain bg-secondary p-2" : "aspect-video"
                    }`}
                    loading="lazy"
                  />
                </button>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/0 opacity-0 transition-[background-color,opacity] group-hover:bg-background/40 group-hover:opacity-100 group-focus-within:bg-background/40 group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(publicUrl, `${mediaTitle}-${img.image_type}-community.jpg`);
                    }}
                    className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("gallery.download", "Bild herunterladen")}
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="absolute top-2 left-2">
                  <Badge className="bg-primary/80 backdrop-blur-sm text-[9px] text-primary-foreground border-0">
                    Community
                  </Badge>
                </div>
              </div>
            );
          })}

        {/* User's own pending uploads */}
        {user && userItems
          .filter((img: any) => img.status === "pending" && img.uploaded_by === user.id)
          .map((img: any) => {
            const publicUrl = supabase.storage.from("media-images").getPublicUrl(img.storage_path).data.publicUrl;
            return (
              <div
                key={img.id}
                className="relative rounded-lg overflow-hidden border border-dashed border-border/60 bg-card/50 opacity-70"
              >
                <img
                  src={publicUrl}
                  alt="Pending"
                   width={activeTab === "posters" ? 600 : activeTab === "logos" ? 1200 : 1280}
                   height={activeTab === "posters" ? 900 : activeTab === "logos" ? 600 : 720}
                  className={`w-full object-cover ${
                    activeTab === "posters" ? "aspect-[2/3]" : activeTab === "logos" ? "aspect-[2/1] object-contain bg-secondary p-2" : "aspect-video"
                  }`}
                  loading="lazy"
                />
                <div className="absolute top-2 left-2">
                  <Badge variant="outline" className="text-[9px] bg-background/70 backdrop-blur-sm gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {t("gallery.pending", "Prüfung")}
                  </Badge>
                </div>
              </div>
            );
          })}
      </div>

      {tmdbItems.length === 0 && userItems.filter((img: any) => img.status === "approved").length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
          {t("gallery.noImages", "Keine Bilder verfügbar")}
        </div>
      )}

      {/* Fullscreen preview */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImg(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setPreviewImg(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={previewImg}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm flex items-center gap-2 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(previewImg, `${mediaTitle}-image.jpg`);
            }}
          >
            <Download className="w-4 h-4" />
            {t("gallery.download", "Herunterladen")}
          </button>
        </div>
      )}
    </section>
  );
};

export default MediaImageGallery;
