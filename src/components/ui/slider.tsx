import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center group", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2.5 w-full grow overflow-hidden rounded-full bg-secondary/60 backdrop-blur-sm transition-colors duration-300">
      <SliderPrimitive.Range className="absolute h-full bg-accent rounded-full transition-all duration-150 ease-out" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-7 w-10 rounded-full border border-border/40 bg-background/80 backdrop-blur-md shadow-[0_0_0_1px_hsl(var(--border)/0.2),0_2px_8px_hsl(0_0%_0%/0.25),inset_0_1px_2px_hsl(0_0%_100%/0.3)] ring-offset-background transition-[transform,box-shadow] duration-200 ease-out hover:scale-110 hover:shadow-[0_0_0_1px_hsl(var(--border)/0.3),0_4px_16px_hsl(0_0%_0%/0.3),inset_0_1px_2px_hsl(0_0%_100%/0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
