import { useState, useCallback } from "react";
import { useImageList, useCachedKeys, useImageMetadata, type ImageMeta } from "@/hooks/useImageMetadataCache";
import Footer from "@/components/Footer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { X as CloseTwoTone, Tag as LabelTwoTone, Camera as PhotoCameraTwoTone, Ratio as AspectRatioTwoTone, RefreshCw as CachedTwoTone, CloudDownload as CloudDownloadTwoTone } from "lucide-react";
const SAMPLE_THUMBNAILS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300",
  "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=300",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
  "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300",
  "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=300",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300",
  "https://images.unsplash.com/photo-1514316454349-750a7fd3da3a?w=300",
  "https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=300",
];

const MetadataGalleryPage = () => {
  const imageIds = useImageList();
  const { cachedKeys, refresh } = useCachedKeys();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold text-foreground">
              Metadaten-Galerie
            </h1>
            <p className="text-muted-foreground">
              Klicke auf ein Bild, um dessen Metadaten zu laden. Bereits gecachte Bilder sind mit einem{" "}
              <CachedTwoTone className="inline w-4 h-4 text-primary" /> markiert.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CachedTwoTone className="w-4 h-4 text-primary" />
              <span>{cachedKeys.size} von {imageIds.length} Bildern im Cache</span>
            </div>
          </div>

          {/* Gallery grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {imageIds.map((id) => {
              const isCached = cachedKeys.has(`img_meta_${id}`);
              return (
                <button
                  key={id}
                  onClick={() => handleSelect(id)}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <img
                    src={SAMPLE_THUMBNAILS[id % SAMPLE_THUMBNAILS.length]}
                    alt={`Bild ${id + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

                  {/* Cache indicator */}
                  <div className="absolute top-2 right-2">
                    {isCached ? (
                      <div className="flex items-center gap-1 bg-primary/90 text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                        <CachedTwoTone className="w-3 h-3" />
                        Cached
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 bg-muted/80 text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                        <CloudDownloadTwoTone className="w-3 h-3" />
                        Nicht gecached
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs font-medium text-foreground truncate">
                      Bild #{id + 1}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Detail dialog – decompress on demand */}
      <Dialog open={selectedId !== null} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Bild-Metadaten
            </DialogTitle>
          </DialogHeader>
          {selectedId !== null && <MetadataDetail id={selectedId} />}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

function MetadataDetail({ id }: { id: number }) {
  const { data, loading, fromCache } = useImageMetadata(id);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full aspect-video rounded-lg" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Keine Daten verfügbar.</p>;

  return (
    <div className="space-y-4">
      <img
        src={data.url}
        alt={data.title}
        className="w-full aspect-video object-cover rounded-lg"
      />

      <div className="flex items-center gap-2">
        <h3 className="font-display font-bold text-lg text-foreground">{data.title}</h3>
        {fromCache && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <CachedTwoTone className="w-3 h-3" /> Aus Cache
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{data.description}</p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AspectRatioTwoTone className="w-4 h-4" />
          <span>{data.width} × {data.height} px</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <PhotoCameraTwoTone className="w-4 h-4" />
          <span>{data.photographer}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <LabelTwoTone className="w-4 h-4 text-muted-foreground" />
        {data.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-[11px]">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default MetadataGalleryPage;
