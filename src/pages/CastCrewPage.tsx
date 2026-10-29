import { useEffect, useState } from "react";
import { useParams, Link } from "@/lib/locale-router";
import { useSearchParams } from "react-router-dom";
import Footer from "@/components/Footer";
import ApiErrorPage from "@/components/ApiErrorPage";
import { Skeleton } from "@/components/ui/skeleton";
import { useMovieDetail, useSeriesDetail, useMovieCredits, useSeriesCredits, usePersonDetail } from "@/hooks/useMedia";
import { tmdbImage, tmdbBackdrop, TmdbCastMember, TmdbCrewMember } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { getPersonCredits } from "@/lib/api";
import ScoreBadge from "@/components/ScoreBadge";
import { ArrowLeft as ArrowBackTwoTone, Film as MovieTwoTone, User as PersonTwoTone, Tv as TvTwoTone } from "lucide-react";

const CastCrewPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const mediaType = searchParams.get("type") || "movie";
  const { t } = useTranslation();

  const { data: movie, isLoading: movieLoading } = useMovieDetail(mediaType === "movie" ? id || "" : "");
  const { data: show, isLoading: showLoading } = useSeriesDetail(mediaType === "series" ? id || "" : "");
  const { data: movieCredits, isLoading: mcLoading } = useMovieCredits(mediaType === "movie" ? id || "" : "");
  const { data: seriesCredits, isLoading: scLoading } = useSeriesCredits(mediaType === "series" ? id || "" : "");

  const media = mediaType === "movie" ? movie : show;
  const credits = mediaType === "movie" ? movieCredits : seriesCredits;
  const isLoading = (mediaType === "movie" ? movieLoading || mcLoading : showLoading || scLoading);
  const title = mediaType === "movie" ? (movie as any)?.title : (show as any)?.name;
  const backdrop = media ? tmdbBackdrop((media as any).backdrop_path) : null;
  const backPath = mediaType === "movie" ? `/filme/${id}` : `/serien/${id}`;

  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);

  useEffect(() => {
    if (title) document.title = `${t("details.castCrew")} – ${title} | CritiCore`;
  }, [title, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-16 container mx-auto px-4 py-12 space-y-8">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-xl" />)}
          </div>
        </main>
      </div>
    );
  }

  if (!media || !credits) return <ApiErrorPage />;

  // Group crew by department
  const crewByDept = new Map<string, TmdbCrewMember[]>();
  for (const member of credits.crew) {
    const dept = member.department || member.known_for_department || "Other";
    if (!crewByDept.has(dept)) crewByDept.set(dept, []);
    crewByDept.get(dept)!.push(member);
  }

  // Deduplicate crew members within departments
  for (const [dept, members] of crewByDept) {
    const seen = new Map<number, TmdbCrewMember>();
    for (const m of members) {
      const existing = seen.get(m.id);
      if (existing) {
        existing.job = existing.job + ", " + m.job;
      } else {
        seen.set(m.id, { ...m });
      }
    }
    crewByDept.set(dept, Array.from(seen.values()));
  }

  // Sort departments with priority
  const deptOrder = ["Directing", "Writing", "Production", "Camera", "Editing", "Sound", "Art", "Costume & Make-Up", "Visual Effects", "Lighting", "Crew"];
  const sortedDepts = Array.from(crewByDept.entries()).sort(([a], [b]) => {
    const ai = deptOrder.indexOf(a);
    const bi = deptOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-16">
        {/* Mini hero */}
        <div className="relative h-48 md:h-64 overflow-hidden">
          {backdrop && <img src={backdrop} alt="" className="w-full h-full object-cover opacity-40" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
          {/* Same horizontal inset as the content below; p-6 plus the container padding indented the header twice */}
          <div className="absolute bottom-0 left-0 right-0 pb-6 md:pb-10">
            <div className="container mx-auto px-4">
              <Link
                to={backPath}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-3 transition-colors group"
              >
                <ArrowBackTwoTone className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                {t("details.backToDetail", { title })}
              </Link>
              <h1
                className="font-display text-2xl md:text-4xl font-bold text-foreground"
                style={{ animation: "hero-title-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
              >
                {t("details.castCrew")}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{title}</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 space-y-16">
          {/* Cast */}
          {credits.cast.length > 0 && (
            <section style={{ animation: "card-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both" }}>
              <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-1 h-6 rounded-full bg-primary inline-block" />
                {t("details.cast")} ({credits.cast.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {credits.cast.map((member, idx) => (
                  <button
                    key={`${member.id}-${idx}`}
                    onClick={() => setSelectedPerson(member.id)}
                    className="group text-left rounded-xl border border-border/40 bg-card overflow-hidden transition-all duration-300 hover:border-primary/25 hover:shadow-[var(--shadow-card-hover)]"
                    style={{ animation: `card-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.15 + idx * 0.02}s both` }}
                  >
                    <div className="aspect-[2/3] bg-secondary overflow-hidden">
                      {member.profile_path ? (
                        <img src={tmdbImage(member.profile_path, "w300")!} alt={member.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PersonTwoTone className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">{member.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{member.character}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Crew by Department */}
          {sortedDepts.map(([dept, members], deptIdx) => (
            <section
              key={dept}
              style={{ animation: `card-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + deptIdx * 0.05}s both` }}
            >
              <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-1 h-6 rounded-full bg-primary inline-block" />
                {dept} ({members.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {members.map((member, idx) => (
                  <button
                    key={`${member.id}-${dept}-${idx}`}
                    onClick={() => setSelectedPerson(member.id)}
                    className="group text-left rounded-xl border border-border/40 bg-card overflow-hidden transition-all duration-300 hover:border-primary/25 hover:shadow-[var(--shadow-card-hover)]"
                  >
                    <div className="aspect-[2/3] bg-secondary overflow-hidden">
                      {member.profile_path ? (
                        <img src={tmdbImage(member.profile_path, "w300")!} alt={member.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PersonTwoTone className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">{member.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{member.job}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Person Detail Dialog */}
      <PersonDialog personId={selectedPerson} onClose={() => setSelectedPerson(null)} />

      <Footer />
    </div>
  );
};

const PersonDialog = ({ personId, onClose }: { personId: number | null; onClose: () => void }) => {
  const { t } = useTranslation();
  const { data: person, isLoading: personLoading } = usePersonDetail(personId);
  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ["person-credits", personId],
    queryFn: () => getPersonCredits(personId!),
    enabled: personId != null,
  });

  const isLoading = personLoading || creditsLoading;

  const movies = credits?.cast?.filter(c => c.media_type === "movie" && c.poster_path).sort((a, b) => b.vote_average - a.vote_average) ?? [];
  const series = credits?.cast?.filter(c => c.media_type === "tv" && c.poster_path).sort((a, b) => b.vote_average - a.vote_average) ?? [];

  return (
    <Dialog open={personId != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="w-24 h-32 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </div>
        ) : person ? (
          <>
            <DialogHeader>
              <div className="flex gap-4">
                {person.profile_path ? (
                  <img src={tmdbImage(person.profile_path, "w185")!} alt={person.name} className="w-24 h-32 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-24 h-32 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <PersonTwoTone className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="min-w-0">
                  <DialogTitle className="font-display text-xl">{person.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{person.known_for_department}</p>
                  {person.birthday && (
                    <p className="text-xs text-muted-foreground mt-1">
                      🎂 {person.birthday}{person.deathday ? ` – † ${person.deathday}` : ""}
                    </p>
                  )}
                  {person.place_of_birth && (
                    <p className="text-xs text-muted-foreground">📍 {person.place_of_birth}</p>
                  )}
                </div>
              </div>
            </DialogHeader>

            {person.biography && (
              <div className="mt-4">
                <h3 className="font-display font-bold text-sm text-foreground mb-2">{t("details.biography", "Biography")}</h3>
                <p className="text-sm text-foreground/80 leading-relaxed line-clamp-6">{person.biography}</p>
              </div>
            )}

            {person.also_known_as?.length > 0 && (
              <div className="mt-3">
                <h3 className="font-display font-bold text-sm text-foreground mb-1.5">{t("details.alsoKnownAs", "Also Known As")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {person.also_known_as.map((name, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground">{name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Filmography */}
            {movies.length > 0 && (
              <div className="mt-6">
                <h3 className="font-display font-bold text-sm text-foreground mb-3 flex items-center gap-1.5">
                  <MovieTwoTone className="w-4 h-4 text-primary" />
                  {t("nav.movies")} ({movies.length})
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {movies.slice(0, 15).map(item => (
                    <Link
                      key={item.id}
                      to={`/filme/${item.id}`}
                      onClick={onClose}
                      className="group rounded-lg overflow-hidden bg-card border border-border/40 hover:border-primary/30 transition-all"
                    >
                      <div className="aspect-[2/3] relative">
                        <img src={tmdbImage(item.poster_path, "w300")!} alt={item.title || item.name || ""} loading="lazy" className="w-full h-full object-cover" />
                        <div className="absolute top-1 right-1"><ScoreBadge score={Math.round(item.vote_average * 10) / 10} size="sm" /></div>
                      </div>
                      <div className="p-1.5">
                        <p className="text-[11px] font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{item.title || item.name}</p>
                        {item.character && <p className="text-[10px] text-muted-foreground line-clamp-1 italic">{item.character}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {series.length > 0 && (
              <div className="mt-6">
                <h3 className="font-display font-bold text-sm text-foreground mb-3 flex items-center gap-1.5">
                  <TvTwoTone className="w-4 h-4 text-primary" />
                  {t("nav.series")} ({series.length})
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {series.slice(0, 15).map(item => (
                    <Link
                      key={item.id}
                      to={`/serien/${item.id}`}
                      onClick={onClose}
                      className="group rounded-lg overflow-hidden bg-card border border-border/40 hover:border-primary/30 transition-all"
                    >
                      <div className="aspect-[2/3] relative">
                        <img src={tmdbImage(item.poster_path, "w300")!} alt={item.title || item.name || ""} loading="lazy" className="w-full h-full object-cover" />
                        <div className="absolute top-1 right-1"><ScoreBadge score={Math.round(item.vote_average * 10) / 10} size="sm" /></div>
                      </div>
                      <div className="p-1.5">
                        <p className="text-[11px] font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{item.title || item.name}</p>
                        {item.character && <p className="text-[10px] text-muted-foreground line-clamp-1 italic">{item.character}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default CastCrewPage;
