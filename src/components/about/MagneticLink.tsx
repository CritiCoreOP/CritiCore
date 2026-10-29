import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { Link } from "@/lib/locale-router";
import { cn } from "@/lib/utils";

/** Primary call to action that leans towards the mouse a little; plain link on touch and reduced motion */
export default function MagneticLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });

  const onMove = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const box = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - box.left - box.width / 2) * 0.25);
    y.set((e.clientY - box.top - box.height / 2) * 0.35);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span className="inline-flex" style={{ x, y }} onPointerMove={onMove} onPointerLeave={onLeave}>
      <Link
        to={to}
        className={cn(
          "inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98]",
          className,
        )}
      >
        {children}
      </Link>
    </motion.span>
  );
}
