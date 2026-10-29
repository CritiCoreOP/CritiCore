import { useState, useEffect, useCallback } from "react";
import { getCachedEntry, setCachedEntry, decompress, getCachedKeys } from "@/lib/metadataCache";

export interface ImageMeta {
  id: number;
  title: string;
  description: string;
  width: number;
  height: number;
  photographer: string;
  tags: string[];
  url: string;
  thumbnail: string;
}

// Simulated API – in production replace with real endpoint
const SAMPLE_IMAGES: Omit<ImageMeta, "id">[] = [
  { title: "Berglandschaft", description: "Sonnenaufgang über den Alpen mit Nebel im Tal.", width: 4000, height: 2667, photographer: "Anna Müller", tags: ["Berge", "Natur", "Sonnenaufgang"], url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300" },
  { title: "Stadtlichter", description: "Nächtliche Skyline einer modernen Großstadt.", width: 5472, height: 3648, photographer: "Max Weber", tags: ["Stadt", "Nacht", "Lichter"], url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800", thumbnail: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=300" },
  { title: "Ozeanwellen", description: "Türkisfarbene Wellen brechen an einem Sandstrand.", width: 3840, height: 2560, photographer: "Lisa Strand", tags: ["Meer", "Strand", "Wellen"], url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800", thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300" },
  { title: "Herbstwald", description: "Goldene Blätter in einem dichten Mischwald.", width: 4896, height: 3264, photographer: "Tom Herbst", tags: ["Wald", "Herbst", "Natur"], url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800", thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300" },
  { title: "Wüstendünen", description: "Endlose Sanddünen unter klarem Himmel.", width: 5184, height: 3456, photographer: "Sarah Sand", tags: ["Wüste", "Sand", "Himmel"], url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800", thumbnail: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300" },
  { title: "Nordlicht", description: "Aurora Borealis über einem verschneiten See.", width: 4608, height: 3072, photographer: "Erik Nordmann", tags: ["Nordlicht", "Nacht", "Winter"], url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800", thumbnail: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=300" },
  { title: "Hügel im Nebel", description: "Grüne Hügellandschaft mit Morgennebel bei Sonnenaufgang.", width: 3000, height: 2000, photographer: "Julia Regen", tags: ["Landschaft", "Nebel", "Natur"], url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800", thumbnail: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300" },
  { title: "Vintage Auto", description: "Klassischer roter Sportwagen in einer Gasse.", width: 4032, height: 3024, photographer: "Karl Auto", tags: ["Auto", "Vintage", "Rot"], url: "https://images.unsplash.com/photo-1514316454349-750a7fd3da3a?w=800", thumbnail: "https://images.unsplash.com/photo-1514316454349-750a7fd3da3a?w=300" },
  { title: "Blumenfeld", description: "Lavendelfeld in der Provence bei Sonnenuntergang.", width: 5616, height: 3744, photographer: "Marie Blume", tags: ["Blumen", "Lavendel", "Sonnenuntergang"], url: "https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=800", thumbnail: "https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=300" },
];

async function fetchImageMetadata(id: number): Promise<ImageMeta> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
  const img = SAMPLE_IMAGES[id % SAMPLE_IMAGES.length];
  return { ...img, id };
}

export function useImageList() {
  // Returns list of image IDs
  return Array.from({ length: 9 }, (_, i) => i);
}

export function useCachedKeys() {
  const [keys, setKeys] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const k = await getCachedKeys();
    setKeys(k);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { cachedKeys: keys, refresh };
}

export function useImageMetadata(id: number | null) {
  const [data, setData] = useState<ImageMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async () => {
    if (id === null) return;
    setLoading(true);
    setFromCache(false);

    const key = `img_meta_${id}`;

    // 1. Check cache
    const cached = await getCachedEntry(key);
    if (cached) {
      const decompressed = decompress<ImageMeta>(cached);
      setData(decompressed);
      setFromCache(true);
      setLoading(false);
      return;
    }

    // 2. Fetch from API
    const meta = await fetchImageMetadata(id);

    // 3. Compress & store
    await setCachedEntry(key, meta);

    setData(meta);
    setFromCache(false);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, fromCache };
}
