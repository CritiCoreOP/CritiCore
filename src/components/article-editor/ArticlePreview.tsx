import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { sanitizeHtml } from "@/lib/sanitize";
import ArticleHtml from "@/components/ArticleHtml";
import CoverCredit from "@/components/CoverCredit";
import { coverCreditColumns, type CoverCredit as CoverCreditValue } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import tgnPlusIcon from "@/assets/tgn-plus.png";
import { Eye as VisibilityTwoTone } from "lucide-react";
import { articleCategoryLabel, articleTypeLabel } from "@/lib/article-labels";

interface ArticlePreviewProps {
  title: string;
  excerpt: string;
  category: string;
  articleType: string;
  coverImage: string | null;
  coverCredit: CoverCreditValue;
  /** Read when the preview opens; a prop value went stale because the editor does not re-render the page */
  getContent: () => string;
  tgnPlus: boolean;
}

const ArticlePreview = ({ title, excerpt, category, articleType, coverImage, coverCredit, getContent, tgnPlus }: ArticlePreviewProps) => {
  const { t } = useTranslation();
  const [content, setContent] = useState("");

  return (
    <Dialog onOpenChange={(open) => open && setContent(getContent())}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title={t("article.preview")}>
          <VisibilityTwoTone className="w-4 h-4" />
          <span className="sr-only">{t("article.preview")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm text-muted-foreground font-normal">
            {t("article.previewTitle")}
          </DialogTitle>
        </DialogHeader>

        <article className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{articleCategoryLabel(t, category)}</Badge>
            <Badge variant="outline">{articleTypeLabel(t, articleType)}</Badge>
            {tgnPlus && <img src={tgnPlusIcon} alt="TGN+" className="w-5 h-5 rounded" />}
          </div>

          {coverImage && (
            <figure>
              <div className="rounded-xl overflow-hidden aspect-[21/9]">
                <img src={coverImage} alt="" className="w-full h-full object-cover" />
              </div>
              <CoverCredit
                className="mt-2"
                credit={coverCreditColumns(coverImage, coverCredit, true).cover_image_credit}
                url={coverCreditColumns(coverImage, coverCredit, true).cover_image_credit_url}
              />
            </figure>
          )}

          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight break-words">
            {title || t("article.untitled")}
          </h1>

          {excerpt && (
            <p className="text-lg text-muted-foreground">{excerpt}</p>
          )}

          <ArticleHtml className="article-body flow-root prose prose-invert max-w-none text-foreground" html={sanitizeHtml(content)} />
        </article>
      </DialogContent>
    </Dialog>
  );
};

export default ArticlePreview;
