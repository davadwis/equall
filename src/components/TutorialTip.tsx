import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTutorial } from "../contexts/tutorial";

interface Props {
  children: ReactNode;
  text: string;
  className?: string;
  tipClassName?: string;
}

export default function TutorialTip({
  children,
  text,
  className = "",
  tipClassName = "",
}: Props) {
  const { isTutorialOn } = useTutorial();

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence>
        {isTutorialOn && (
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-none absolute -inset-1.5 rounded-[1.15rem] border-2 border-amber-400 shadow-[0_0_0_4px_rgba(245,158,11,0.14)]"
          />
        )}
      </AnimatePresence>
      {children}
      <AnimatePresence initial={false}>
        {isTutorialOn && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className={`mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100 ${tipClassName}`}
            >
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
