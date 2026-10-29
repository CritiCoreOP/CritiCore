import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";

const ForumFooter = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-foreground">CritiCore Forums</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://criticore.cc" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              criticore.cc
            </a>
            <Link to="/impressum" className="hover:text-foreground transition-colors">
              {t("footer.imprint", "Impressum")}
            </Link>
            <Link to="/datenschutz" className="hover:text-foreground transition-colors">
              {t("footer.privacy", "Datenschutz")}
            </Link>
            <Link to="/agb" className="hover:text-foreground transition-colors">
              {t("footer.terms", "AGB")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ForumFooter;
