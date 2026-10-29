import { Link } from "@/lib/locale-router";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Home as HomeTwoTone } from "lucide-react";
const ApiErrorPage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 flex items-center justify-center min-h-[70vh]">
        <div className="text-center px-4">
          <p className="font-display text-[10rem] md:text-[14rem] leading-none font-bold text-primary/20 select-none">?</p>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground -mt-8">
            {t("error.notFound", "Wurde leider nicht gefunden, sorry!")}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto text-sm">
            {t("error.notFoundDesc", "Die Daten konnten nicht geladen werden. Bitte versuche es später erneut.")}
          </p>
          <Button asChild className="mt-8">
            <Link to="/">
              <HomeTwoTone className="w-4 h-4 mr-2" />
              {t("error.backHome", "Zurück zur Homepage")}
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ApiErrorPage;
