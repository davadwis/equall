import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";

const STEPS = [
  { key: "session", icon: "🎯" },
  { key: "menu", icon: "🍽️" },
  { key: "assign", icon: "👥" },
  { key: "charges", icon: "💰" },
  { key: "payment", icon: "💳" },
  { key: "summary", icon: "📋" },
];

interface Props {
  currentStep: number;
}

export default function ProgressStepper({ currentStep }: Props) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const inactiveColor = isDark ? "#374151" : "#e5e7eb";
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center min-w-max mx-auto px-4">
        {STEPS.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          return (
            <div key={stepNum} className="flex items-center">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isCompleted
                      ? "#10b981"
                      : isActive
                        ? "#6366f1"
                        : inactiveColor,
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{
                    color:
                      isCompleted || isActive
                        ? "#fff"
                        : isDark
                          ? "#6b7280"
                          : "#9ca3af",
                  }}
                >
                  {isCompleted ? "✓" : step.icon}
                </motion.div>
                <span
                  className={`text-xs mt-1 font-medium transition-colors duration-300 ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : isCompleted
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-400 dark:text-gray-600"
                  }`}
                >
                  {t(`steps.${step.key}`)}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className="w-8 h-0.5 mx-1 mb-4 transition-colors duration-300"
                  style={{
                    backgroundColor: isCompleted ? "#10b981" : inactiveColor,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
