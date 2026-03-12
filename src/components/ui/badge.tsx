import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-900 text-white",
        neutral: "border-slate-300 bg-slate-100 text-slate-700",
        low: "border-emerald-300 bg-emerald-100 text-emerald-800",
        moderate: "border-amber-300 bg-amber-100 text-amber-800",
        high: "border-rose-300 bg-rose-100 text-rose-800",
        extreme: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
