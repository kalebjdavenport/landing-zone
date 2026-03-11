"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AnimatedListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className?: string;
}

export function AnimatedList<T>({ items, getKey, renderItem, className }: AnimatedListProps<T>) {
  return (
    <div className={cn("space-y-2", className)}>
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={getKey(item)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {renderItem(item)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
