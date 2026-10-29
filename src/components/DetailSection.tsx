import { ReactNode, forwardRef, useId } from "react";
import { useInView } from "@/hooks/useInView";

interface DetailSectionProps {
  title: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
  id?: string;
}

const DetailSection = forwardRef<HTMLElement, DetailSectionProps>(
  ({ title, icon, trailing, children, delay = 0, className = "", id }, ref) => {
    const autoId = useId();
    const headingId = id ? `${id}-heading` : `section-${autoId}`;
    const { ref: inViewRef, inView } = useInView<HTMLElement>();

    const setRefs = (node: HTMLElement | null) => {
      inViewRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node;
    };

    return (
      <section
        ref={setRefs}
        id={id}
        aria-labelledby={headingId}
        className={`transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[opacity,transform] ${
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        } ${className}`}
        style={{ transitionDelay: inView ? `${delay}s` : "0s" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id={headingId} className="font-display text-xl font-bold text-foreground flex items-center gap-2.5">
            {icon}
            {title}
          </h2>
          {trailing}
        </div>
        {children}
      </section>
    );
  }
);

DetailSection.displayName = "DetailSection";

export default DetailSection;
