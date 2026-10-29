import { Link } from "@/lib/locale-router";
import { useTranslation } from "react-i18next";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { type Category, getCategoryPath, useCategories } from "@/hooks/useCategories";

interface CategoryBreadcrumbsProps {
  categoryId: string;
}

const CategoryBreadcrumbs = ({ categoryId }: CategoryBreadcrumbsProps) => {
  const { t } = useTranslation();
  const { data: categories } = useCategories();
  if (!categories) return null;

  const path = getCategoryPath(categories, categoryId);
  if (path.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/entdecken">{t("explore.title")}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {path.map((cat, i) => (
          <span key={cat.id} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {i === path.length - 1 ? (
                <BreadcrumbPage>{cat.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={`/entdecken?kategorie=${cat.slug}`}>{cat.name}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default CategoryBreadcrumbs;
