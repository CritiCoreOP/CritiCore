import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { Server as DnsTwoTone, Lock as LockTwoTone, Shield as SecurityTwoTone } from "lucide-react";

const AdminSettings = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">{t("admin.settings.title")}</h1><p className="text-muted-foreground text-sm">{t("admin.settings.subtitle")}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><SecurityTwoTone className="w-5 h-5 text-primary" />{t("admin.settings.security")}</CardTitle><CardDescription>{t("admin.settings.securityDesc")}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm"><span>{t("admin.settings.rlsPolicies")}</span><Badge className="bg-green-600/20 text-green-400 border-green-600/30">{t("admin.settings.active")}</Badge></div>
            <div className="flex items-center justify-between text-sm"><span>{t("admin.settings.adminRoleCheck")}</span><Badge className="bg-green-600/20 text-green-400 border-green-600/30">{t("admin.settings.active")}</Badge></div>
            <div className="flex items-center justify-between text-sm"><span>{t("admin.settings.moderationLogs")}</span><Badge className="bg-green-600/20 text-green-400 border-green-600/30">{t("admin.settings.notDeletable")}</Badge></div>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><LockTwoTone className="w-5 h-5 text-primary" />{t("admin.settings.accessRights")}</CardTitle><CardDescription>{t("admin.settings.accessRightsDesc")}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm"><span>{t("admin.settings.adminRole")}</span><span className="text-muted-foreground text-xs">{t("admin.settings.adminRoleDesc")}</span></div>
            <div className="flex items-center justify-between text-sm"><span>{t("admin.settings.pressRole")}</span><span className="text-muted-foreground text-xs">{t("admin.settings.pressRoleDesc")}</span></div>
            <div className="flex items-center justify-between text-sm"><span>{t("admin.settings.userRole")}</span><span className="text-muted-foreground text-xs">{t("admin.settings.userRoleDesc")}</span></div>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><DnsTwoTone className="w-5 h-5 text-primary" />{t("admin.settings.system")}</CardTitle><CardDescription>{t("admin.settings.systemDesc")}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm"><span>{t("admin.settings.platform")}</span><span className="text-muted-foreground text-xs">CritiCore Admin v1.0</span></div>
            <div className="flex items-center justify-between text-sm"><span>{t("admin.settings.backend")}</span><Badge className="bg-green-600/20 text-green-400 border-green-600/30">{t("admin.settings.connected")}</Badge></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
