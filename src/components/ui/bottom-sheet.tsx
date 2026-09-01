"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  height?: string;
}

export function BottomSheet({
  open,
  onClose,
  children,
  className,
  height = "92vh",
}: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 rounded-t-[2rem] bg-card border-t-2 border-foreground/70 shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.15)] overflow-hidden",
          className
        )}
        style={{ height }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 35,
          mass: 0.8,
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3 select-none">
          <div className="h-1 w-12 rounded-full bg-foreground/20" />
        </div>

        {/* Content */}
        <div className="h-[calc(100%-2rem)] overflow-y-auto pb-safe">
          {children}
        </div>
      </motion.div>
    </>
  );
}
