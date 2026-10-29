import { useTranslation } from "react-i18next";
import DetailSection from "@/components/DetailSection";
import { tmdbImage, type TmdbWatchProvider, type TmdbWatchProviders } from "@/lib/api";
import { LANG_TO_LOCALE } from "@/lib/localeRouting";
import { cn } from "@/lib/utils";

type ProviderBlock = { results: Record<string, TmdbWatchProviders> } | undefined;

/** One offer per service: "Netflix Standard with Ads" and "HBO Max Amazon Channel" repeat the main entry. */
function uniqueProviders(list: TmdbWatchProvider[] = []) {
  const kept: TmdbWatchProvider[] = [];
  for (const p of [...list].sort((a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99))) {
    if (kept.some((k) => p.provider_name.startsWith(`${k.provider_name} `))) continue;
    kept.push(p);
  }
  return kept;
}

/** Offers for the reader's country (DE for German, US for English …) */
export function useRegionOffers(providers: ProviderBlock) {
  const { i18n } = useTranslation();
  const region = (LANG_TO_LOCALE[i18n.language] || "de-DE").split("-")[1];
  const offers = providers?.results?.[region];
  return {
    offers,
    stream: uniqueProviders([...(offers?.flatrate ?? []), ...(offers?.free ?? []), ...(offers?.ads ?? [])]).slice(0, 6),
    buy: uniqueProviders([...(offers?.buy ?? []), ...(offers?.rent ?? [])]).slice(0, 8),
  };
}

/* Where to watch: streaming first, buying second; JustWatch has to be named as the source */
const WatchProviders = ({ providers, delay = 0.12 }: { providers: ProviderBlock; delay?: number }) => {
  const { t } = useTranslation();
  const { offers, stream, buy } = useRegionOffers(providers);
  if (!offers || (!stream.length && !buy.length)) return null;
  const href = offers.link;

  return (
    <DetailSection title={t("details.whereToWatch")} delay={delay}>
      {stream.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {stream.map((p) => (
            <li key={p.provider_id}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-card/50 py-1.5 pl-1.5 pr-3.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-card"
              >
                {p.logo_path && <img src={tmdbImage(p.logo_path, "w92")!} alt="" className="h-8 w-8 rounded-lg" loading="lazy" />}
                {p.provider_name}
              </a>
            </li>
          ))}
        </ul>
      )}
      {buy.length > 0 && (
        <div className={cn("flex flex-wrap items-center gap-2", stream.length > 0 && "mt-4")}>
          <span className="mr-1 text-xs text-muted-foreground">{t("details.buyOrRent")}</span>
          {buy.map((p) =>
            p.logo_path ? (
              <a key={p.provider_id} href={href} target="_blank" rel="noopener noreferrer" title={p.provider_name} className="rounded-md opacity-80 transition-opacity hover:opacity-100">
                <img src={tmdbImage(p.logo_path, "w92")!} alt={p.provider_name} className="h-8 w-8 rounded-md" loading="lazy" />
              </a>
            ) : null,
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {t("details.watchSource")}{" "}
        <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">JustWatch</a>
      </p>
    </DetailSection>
  );
};

export default WatchProviders;
