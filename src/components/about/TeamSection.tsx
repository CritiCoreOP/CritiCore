import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowRight, PenLine } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditorialTeam } from "@/hooks/useEditorialTeam";
import { Link } from "@/lib/locale-router";
import { LEGAL_ENTITY } from "@/lib/legalEntity";
import { staffRoleLabels } from "@/lib/staffRoles";
import { cn } from "@/lib/utils";
import Reveal from "./Reveal";

/** Card that tilts towards the pointer, driven by motion values outside the React render */
function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-10, 10]), { stiffness: 200, damping: 18 });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 18 });

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const box = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - box.left) / box.width - 0.5);
    py.set((e.clientY - box.top) / box.height - 0.5);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div className="[perspective:900px]" onPointerMove={onMove} onPointerLeave={onLeave}>
      <motion.div style={{ rotateX, rotateY }} className={cn("h-full", className)}>
        {children}
      </motion.div>
    </div>
  );
}

export default function TeamSection() {
  const { t } = useTranslation();
  const { data: team, isLoading } = useEditorialTeam();
  // Members plus the free seat; from three cards on, three columns
  const wide = (team?.length ?? 1) + 1 >= 3;

  return (
    <section aria-labelledby="about-team-title" className="container mx-auto max-w-6xl px-4 py-24 md:py-32">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 id="about-team-title" className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          {t("transparencyPage.team.title")}
        </h2>
        <p className="mt-6 text-xl leading-relaxed text-muted-foreground md:text-2xl">
          {t("aboutPage.team.statement", { name: LEGAL_ENTITY.name })}
        </p>
      </Reveal>

      <Reveal delay={0.1} className={cn("mx-auto mt-14 grid gap-5 sm:grid-cols-2", wide ? "max-w-5xl lg:grid-cols-3" : "max-w-3xl")}>
        {isLoading && <Skeleton className="h-64 rounded-2xl" />}
        {team?.map((member) => {
          const name = member.display_name || member.username || "?";
          return (
            <TiltCard key={member.user_id}>
              <Link
                to={`/user/${member.user_id}`}
                data-testid="about-team-member"
                className="flex h-full flex-col items-center rounded-2xl border border-border/50 bg-card/70 p-8 text-center transition-colors hover:border-primary/50"
              >
                <Avatar className="h-24 w-24 border border-border/60">
                  {member.avatar_url && <AvatarImage src={member.avatar_url} alt="" />}
                  <AvatarFallback className="bg-primary/15 text-2xl text-primary">{name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="mt-5 font-display text-2xl font-bold text-foreground">{name}</span>
                <span className="mt-2 text-sm leading-relaxed text-accent-light">{staffRoleLabels(member.staff_roles, t).join(", ")}</span>
              </Link>
            </TiltCard>
          );
        })}
        {/* The seat that is still free: how to write for CritiCore */}
        <TiltCard>
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 p-8 text-center">
            <span className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground">
              <PenLine className="h-8 w-8" aria-hidden="true" />
            </span>
            <p className="mt-5 max-w-[30ch] leading-relaxed text-muted-foreground">{t("aboutPage.team.join")}</p>
            <Link
              to="/presse"
              className="mt-5 inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t("transparencyPage.links.press")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </TiltCard>
      </Reveal>
    </section>
  );
}
