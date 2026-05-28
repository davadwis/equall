import { useTranslation } from "react-i18next";

interface Props {
  variant?: "hero" | "page";
}

export default function LanguageSwitcher({ variant = "hero" }: Props) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("id") ? "id" : "en";

  const toggle = () => {
    i18n.changeLanguage(currentLang === "id" ? "en" : "id");
  };

  const heroClass =
    "bg-white/10 hover:bg-white/20 text-white border border-white/20";
  const pageClass =
    "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700";

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        variant === "hero" ? heroClass : pageClass
      }`}
      title={currentLang === "id" ? "Switch to English" : "Ganti ke Indonesia"}
    >
      <span>{currentLang === "id" ? "🇮🇩" : "🇬🇧"}</span>
      <span>{currentLang.toUpperCase()}</span>
    </button>
  );
}
