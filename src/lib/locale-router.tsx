/**
 * Locale-aware wrappers around react-router-dom.
 * Import Link, NavLink, useNavigate from here instead of react-router-dom
 * to automatically prefix all paths with the current locale (e.g. /de-DE/games)
 * AND translate route segments to the current language.
 */
import { forwardRef, useCallback } from "react";
import {
  Link as RRLink,
  NavLink as RRNavLink,
  useNavigate as useRRNavigate,
  useLocation,
  useParams,
  useSearchParams,
  Outlet,
  Navigate,
  Routes,
  Route,
  BrowserRouter,
  type LinkProps,
  type NavLinkProps,
  type To,
  type NavigateOptions,
} from "react-router-dom";
import { getLocaleFromPath, getCurrentLocale, getLangFromLocale, translatePath } from "./localeRouting";

function useCurrentLocale(): string {
  const location = useLocation();
  return getLocaleFromPath(location.pathname) || getCurrentLocale();
}

function useCurrentLang(): string {
  const locale = useCurrentLocale();
  return getLangFromLocale(locale) || "de";
}

function prefixAndTranslatePath(path: string, locale: string, lang: string): string {
  if (!path.startsWith("/")) return path;
  if (getLocaleFromPath(path)) return path; // Already prefixed
  const translated = translatePath(path, lang);
  return `/${locale}${translated}`;
}

function prefixTo(to: To, locale: string, lang: string): To {
  if (typeof to === "string") return prefixAndTranslatePath(to, locale, lang);
  if (typeof to === "object" && to.pathname) {
    return { ...to, pathname: prefixAndTranslatePath(to.pathname, locale, lang) };
  }
  return to;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(({ to, ...props }, ref) => {
  const locale = useCurrentLocale();
  const lang = useCurrentLang();
  return <RRLink ref={ref} to={prefixTo(to, locale, lang)} {...props} />;
});
Link.displayName = "Link";

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(({ to, ...props }, ref) => {
  const locale = useCurrentLocale();
  const lang = useCurrentLang();
  return <RRNavLink ref={ref} to={prefixTo(to, locale, lang)} {...props} />;
});
NavLink.displayName = "NavLink";

export function useNavigate() {
  const nav = useRRNavigate();
  const locale = useCurrentLocale();
  const lang = useCurrentLang();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === "number") return nav(to);
      nav(prefixTo(to, locale, lang), options);
    },
    [nav, locale, lang]
  );
}

/** Get locale-prefixed + translated path for dynamic URL building (e.g. for setSeo) */
export function useLocalePath() {
  const locale = useCurrentLocale();
  const lang = useCurrentLang();
  return (path: string) => prefixAndTranslatePath(path, locale, lang);
}

// Re-export unchanged utilities
export {
  useLocation,
  useParams,
  useSearchParams,
  Outlet,
  Navigate,
  Routes,
  Route,
  BrowserRouter,
} from "react-router-dom";
