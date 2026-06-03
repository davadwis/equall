import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useStore } from "../store/useStore";
import { useToast } from "../components/Toast";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ThemeSwitcher from "../components/ThemeSwitcher";
import TutorialTip from "../components/TutorialTip";
import { useTutorial } from "../contexts/tutorial";
import { CURRENCIES } from "../types";
import type { Currency, SplitMode } from "../types";

export default function CreateSession() {
  const navigate = useNavigate();
  const createSession = useStore((s) => s.createSession);
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { isTutorialOn, toggleTutorial } = useTutorial();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("IDR");
  const [splitMode, setSplitMode] = useState<SplitMode>("itemized");
  const [isLoading, setIsLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number[]>([0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      showToast(t("createSession.validationMinChar"), "error");
      return;
    }
    setIsLoading(true);
    createSession(name.trim(), currency, splitMode);
    await new Promise((r) => setTimeout(r, 300));
    setIsLoading(false);
    navigate("/menu");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 pt-12 pb-16">
        <div className="max-w-md mx-auto text-center">
          <div className="flex justify-end gap-2 mb-2">
            <button
              onClick={toggleTutorial}
              className={`h-8 rounded-lg border px-2.5 text-xs font-bold transition-colors ${
                isTutorialOn
                  ? "border-amber-200 bg-white text-amber-700"
                  : "border-white/20 bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {isTutorialOn ? t("common.tutorialOn") : t("common.tutorial")}
            </button>
            <LanguageSwitcher variant="hero" />
            <ThemeSwitcher variant="hero" />
          </div>
          <motion.img
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            src="/logo-512.png"
            alt="equall logo"
            width={80}
            height={80}
            className="w-20 h-20 mx-auto mb-4"
          />
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-4xl font-black tracking-tight mb-2"
          >
            equall
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-indigo-100 text-base"
          >
            {t("createSession.heroTagline")}
          </motion.p>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 -mt-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            type: "spring",
            stiffness: 200,
            damping: 20,
          }}
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl w-full max-w-md p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
            {t("createSession.cardTitle")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t("createSession.cardSubtitle")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <TutorialTip text={t("createSession.tutorialSessionName")}>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t("createSession.sessionNameLabel")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("createSession.sessionNamePlaceholder")}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition text-gray-800 placeholder-gray-300 dark:placeholder-gray-600"
                maxLength={60}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {t("createSession.sessionNameHint")}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {name.length}/60
                </span>
              </div>
            </TutorialTip>

            <TutorialTip text={t("createSession.tutorialCurrency")}>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t("createSession.currencyLabel")}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition text-gray-800 bg-white"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </TutorialTip>

            <TutorialTip text={t("createSession.tutorialSplitMode")}>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                {t("createSession.splitModeLabel")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["itemized", "equal"] as SplitMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSplitMode(mode)}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      splitMode === mode
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-200"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    <span className="block text-sm font-bold">
                      {mode === "itemized"
                        ? t("createSession.splitModeItemized")
                        : t("createSession.splitModeEqual")}
                    </span>
                    <span className="mt-1 block text-xs opacity-80">
                      {mode === "itemized"
                        ? t("createSession.splitModeItemizedHint")
                        : t("createSession.splitModeEqualHint")}
                    </span>
                  </button>
                ))}
              </div>
            </TutorialTip>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-base shadow-md hover:shadow-lg transition-shadow disabled:opacity-60 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    aria-hidden="true"
                    focusable="false"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {t("common.processing")}
                </span>
              ) : (
                t("createSession.submitBtn")
              )}
            </motion.button>
          </form>

          {/* Features */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-3">
            {[
              { icon: "💯", label: t("createSession.feature1") },
              { icon: "⚡", label: t("createSession.feature2") },
              { icon: "🔗", label: t("createSession.feature3") },
            ].map((f) => (
              <div key={f.label} className="text-center">
                <div className="text-2xl mb-1">{f.icon}</div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="px-4 pt-8 pb-8 md:pt-10">
        <div className="max-w-3xl mx-auto bg-white/70 dark:bg-gray-900/70 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">
            {t("createSession.seoTitle")}
          </h2>
          <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            {t("createSession.seoParagraph1")}
          </p>
          <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            {t("createSession.seoParagraph2")}
          </p>
          <div className="mt-4 grid gap-2 text-sm text-gray-700 dark:text-gray-300">
            <p>{`• ${t("createSession.seoPoint1")}`}</p>
            <p>{`• ${t("createSession.seoPoint2")}`}</p>
            <p>{`• ${t("createSession.seoPoint3")}`}</p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-100">
              {t("createSession.faqTitle")}
            </h3>

            <div className="mt-4 space-y-3">
              {[
                { q: t("createSession.faqQ1"), a: t("createSession.faqA1") },
                { q: t("createSession.faqQ2"), a: t("createSession.faqA2") },
                { q: t("createSession.faqQ3"), a: t("createSession.faqA3") },
              ].map((item, index) => {
                const isOpen = openFaq.includes(index);

                return (
                  <div
                    key={item.q}
                    className="rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFaq((prev) =>
                          isOpen ? prev.filter((i) => i !== index) : [...prev, index],
                        )
                      }
                      aria-expanded={isOpen}
                      className="w-full px-4 py-3 flex items-center justify-between text-left"
                    >
                      <span className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 pr-4">
                        {item.q}
                      </span>
                      <span
                        className={`text-indigo-500 dark:text-indigo-300 text-lg leading-none transition-transform ${
                          isOpen ? "rotate-45" : "rotate-0"
                        }`}
                      >
                        +
                      </span>
                    </button>

                    {isOpen && (
                      <p className="px-4 pb-4 text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-600">
        equall &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
