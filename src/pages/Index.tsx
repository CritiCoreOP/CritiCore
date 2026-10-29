import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import MediaGrid from "@/components/MediaGrid";
import GameGrid from "@/components/GameGrid";
import NewsletterSubscribe from "@/components/NewsletterSubscribe";
import WhatsNewDialog from "@/components/WhatsNewDialog";
import UserWarningPopup from "@/components/UserWarningPopup";
import PrideBanner from "@/components/PrideBanner";
import ForYouRow from "@/components/ForYouRow";
import { Page } from "@/components/layout/Page";
import { Container } from "@/components/layout/Container";
import { PortalLayout, useRailShown } from "@/components/layout/PortalLayout";
import PortalRail from "@/components/layout/PortalRail";
import FrontPageNews from "@/components/news/FrontPageNews";

import { useTrendingMovies, usePopularGames, useTrendingSeries } from "@/hooks/useMedia";
import { useAuth } from "@/hooks/useAuth";
import { useLayoutPrefs } from "@/lib/layoutPrefs";
import { Tv as LiveTvTwoTone, Film as MovieTwoTone } from "lucide-react";

const Index = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const railShown = useRailShown();
  const { homeOrder } = useLayoutPrefs();

  useEffect(() => {
    document.title = t("meta.home.title");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("meta.home.description"));
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", t("meta.home.title"));
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", t("meta.home.description"));
  }, [t]);

  const { data: movies, isLoading: moviesLoading } = useTrendingMovies();
  const { data: games, isLoading: gamesLoading } = usePopularGames();
  const { data: series, isLoading: seriesLoading } = useTrendingSeries();

  // The latest stories, with trends and the newsletter beside them
  const news = (
    <PortalLayout rail={<PortalRail />}>
      <FrontPageNews />
    </PortalLayout>
  );

  const media = (
    <div className="space-y-14">
      <PrideBanner />
      {user && <ForYouRow />}
      <MediaGrid
        title={t("home.trendingMovies")}
        icon={<MovieTwoTone className="w-5 h-5" />}
        items={movies?.results?.slice(0, 6)}
        isLoading={moviesLoading}
        type="filme"
        viewAllLink="/filme"
      />
      <MediaGrid
        title={t("home.trendingSeries")}
        icon={<LiveTvTwoTone className="w-5 h-5" />}
        items={series?.results?.slice(0, 6)}
        isLoading={seriesLoading}
        type="serien"
        viewAllLink="/serien"
      />
      <GameGrid
        title={t("home.topGames")}
        items={games?.results?.slice(0, 6)}
        isLoading={gamesLoading}
        viewAllLink="/games"
      />
    </div>
  );

  return (
    <Page>
      {user && <WhatsNewDialog />}
      {user && <UserWarningPopup />}

      <h1 className="sr-only">{t("hero.h1")}</h1>
      <Container>
        {/* News first by default; "media first" (settings) swaps the two blocks */}
        {homeOrder === "media" ? (
          <>
            {media}
            <div className="mt-14 border-t border-border/40 pt-12">{news}</div>
          </>
        ) : (
          <>
            {news}
            <div className="mt-14 border-t border-border/40 pt-12">{media}</div>
          </>
        )}

        {/* On desktop the newsletter box is part of the side rail */}
        {!railShown && (
          <div className="mt-14">
            <NewsletterSubscribe />
          </div>
        )}
      </Container>
    </Page>
  );
};

export default Index;
