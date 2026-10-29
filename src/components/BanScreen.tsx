import { useTranslation } from "react-i18next";
import { Ban as BlockTwoTone } from "lucide-react";

interface BanScreenProps {
  reason?: string | null;
  type?: "account" | "ip";
}

const BanScreen = ({ reason, type = "account" }: BanScreenProps) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
      <div className="max-w-md w-full mx-6 text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center">
          <BlockTwoTone className="!text-[40px] text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {type === "ip" ? t("ban.ipBannedTitle") : t("ban.accountBannedTitle")}
          </h1>
          <p className="text-muted-foreground">
            {type === "ip" ? t("ban.ipBannedDesc") : t("ban.accountBannedDesc")}
          </p>
        </div>

        {reason && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-left">
            <p className="text-xs font-medium text-destructive mb-1">{t("ban.reason")}</p>
            <p className="text-sm text-foreground">{reason}</p>
          </div>
        )}

        <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("ban.contactSupport")}
          </p>
          <a
            href="mailto:support@tgn.news"
            className="text-sm text-primary hover:underline font-medium"
          >
            support@tgn.news
          </a>
        </div>
      </div>
    </div>
  );
};

export default BanScreen;
