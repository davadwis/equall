import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { Transition } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useStore } from "../store/useStore";
import ProgressStepper from "./ProgressStepper";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import ConfirmDialog from "./ConfirmDialog";
import { useTutorial } from "../contexts/tutorial";

interface Props {
  children: ReactNode;
  currentStep: number;
  title: string;
  subtitle?: string;
}

const pageVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const pageTransition: Transition = {
  duration: 0.3,
};

export default function PageLayout({
  children,
  currentStep,
  title,
  subtitle,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const resetStore = useStore((s) => s.resetStore);
  const { isTutorialOn, toggleTutorial } = useTutorial();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    resetStore();
    navigate("/");
  };
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                equall
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                {t("common.appTagline")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTutorial}
                title={t("common.tutorial")}
                className={`h-8 rounded-lg border px-2.5 text-xs font-bold transition-colors ${
                  isTutorialOn
                    ? "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200"
                    : "border-gray-200 bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-amber-950/50"
                }`}
              >
                {isTutorialOn
                  ? t("common.tutorialOn")
                  : t("common.tutorial")}
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                title={t("common.resetAll")}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-950/50 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-colors text-sm"
              >
                🔄
              </button>
              <LanguageSwitcher variant="page" />
              <ThemeSwitcher variant="page" />
            </div>
          </div>
          <ProgressStepper currentStep={currentStep} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>

      <ConfirmDialog
        isOpen={showResetConfirm}
        title={t("common.resetConfirmTitle")}
        message={t("common.resetConfirmMsg")}
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </motion.div>
  );
}
