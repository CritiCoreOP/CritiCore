import { TmdbReleaseDates, TmdbContentRatings } from "@/lib/api";
const fsk0 = { url: "/static/fsk/fsk-0.png" };
const fsk6 = { url: "/static/fsk/fsk-6.png" };
const fsk12 = { url: "/static/fsk/fsk-12.png" };
const fsk16 = { url: "/static/fsk/fsk-16.png" };
const fsk18 = { url: "/static/fsk/fsk-18.png" };

/** Resolve the German (DE) age certification from TMDB movie release_dates. */
export function resolveMovieCertification(
  releaseDates?: TmdbReleaseDates
): { rating: string } | null {
  const entry = releaseDates?.results?.find((r) => r.iso_3166_1 === "DE");
  if (!entry) return null;
  const cert = entry.release_dates.find((d) => d.certification && d.certification.trim());
  return cert ? { rating: cert.certification.trim() } : null;
}

/** Resolve the German (DE) content rating from TMDB series content_ratings. */
export function resolveSeriesCertification(
  contentRatings?: TmdbContentRatings
): { rating: string } | null {
  const entry = contentRatings?.results?.find(
    (r) => r.iso_3166_1 === "DE" && r.rating && r.rating.trim()
  );
  return entry ? { rating: entry.rating.trim() } : null;
}

const FSK_LOGOS: Record<string, { src: string; label: string }> = {
  "0": { src: fsk0.url, label: "FSK ab 0 freigegeben" },
  "6": { src: fsk6.url, label: "FSK ab 6 freigegeben" },
  "12": { src: fsk12.url, label: "FSK ab 12 freigegeben" },
  "16": { src: fsk16.url, label: "FSK ab 16 freigegeben" },
  "18": { src: fsk18.url, label: "FSK ab 18 freigegeben" },
};

interface AgeRatingBadgeProps {
  rating: string;
}

const AgeRatingBadge = ({ rating }: AgeRatingBadgeProps) => {
  const fsk = FSK_LOGOS[rating];
  if (!fsk) return null;

  return (
    <img
      src={fsk.src}
      alt={fsk.label}
      title={fsk.label}
      className="h-7 w-7 object-contain rounded-sm drop-shadow-sm"
      loading="lazy"
    />
  );
};

export default AgeRatingBadge;
