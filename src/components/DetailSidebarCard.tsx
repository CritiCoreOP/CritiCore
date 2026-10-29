import { ReactNode, useId } from "react";
import { useInView } from "@/hooks/useInView";

interface DetailSidebarCardProps {
  title: string;
  children: ReactNode;
  delay?: number;
}

const DetailSidebarCard = ({ title, children, delay = 0 }: DetailSidebarCardProps) => {
  const id = useId();
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      ref={ref}
      aria-labelledby={`sidebar-${id}`}
      className={`rounded-2xl border border-border/25 bg-card/60 p-5 space-y-3 shadow-[var(--shadow-card)]
        transition-[opacity,transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        hover:-translate-y-0.5 hover:border-border/45 hover:shadow-[var(--shadow-card-hover)]
        ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
      style={{ transitionDelay: inView ? `${delay}s` : "0s" }}
    >
      <h3
        id={`sidebar-${id}`}
        className="text-[11px] font-bold text-foreground/70 uppercase tracking-[0.15em]"
      >
        {title}
      </h3>
      {children}
    </section>
  );
};

export default DetailSidebarCard;
