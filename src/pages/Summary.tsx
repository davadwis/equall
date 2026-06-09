import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import { useTranslation } from "react-i18next";
import { useStore } from "../store/useStore";
import { useToast } from "../components/Toast";
import PageLayout from "../components/PageLayout";
import TutorialTip from "../components/TutorialTip";
import { formatCurrency } from "../lib/formatters";
import { calculatePersonSummaries } from "../lib/calculations";
import { saveSession } from "../lib/supabase";
import type { SplitBillState } from "../types";

export default function Summary() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t, i18n } = useTranslation();
  const summaryRef = useRef<HTMLDivElement>(null);

  const session = useStore((s) => s.session);
  const menuPool = useStore((s) => s.menuPool);
  const persons = useStore((s) => s.persons);
  const charges = useStore((s) => s.charges);
  const paymentMethods = useStore((s) => s.paymentMethods);
  const paymentContributions = useStore((s) => s.paymentContributions);

  const [isSaving, setIsSaving] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const currency = session?.currency ?? "IDR";
  const summaries = calculatePersonSummaries(
    persons,
    charges,
    menuPool,
    session?.splitMode,
    paymentContributions,
  );
  const grandTotal = summaries.reduce((s, ps) => s + ps.total, 0);
  const hasContributions = paymentContributions.length > 0;
  const contributionTotal = summaries.reduce(
    (sum, ps) => sum + (ps.contributionAmount ?? 0),
    0,
  );

  const handleSave = async () => {
    if (!session) return;
    setIsSaving(true);
    try {
      const state: SplitBillState = {
        session,
        menuPool,
        persons,
        charges,
        paymentMethods,
        paymentContributions,
      };
      await saveSession(session.slug, state);
      const link = `${window.location.origin}/split/${session.slug}`;
      setShareLink(link);
      showToast(t("summary.toastSaved"), "success");
    } catch {
      showToast(t("summary.toastSaveFail"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      showToast(t("summary.toastCopied"), "success");
    }
  };

  const handleCopyText = () => {
    const lines: string[] = [];
    lines.push(`🧾 ${session?.name ?? ""}`);
    lines.push(
      `📅 ${new Date().toLocaleDateString(i18n.language?.startsWith("id") ? "id-ID" : "en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    );
    lines.push("");
    summaries.forEach((ps) => {
      lines.push(`👤 ${ps.person.name}`);
      ps.person.claimedItems.forEach((ci) => {
        lines.push(
          `  • ${ci.name} ×${ci.qty}  →  ${formatCurrency(ci.subtotal, currency)}`,
        );
      });
      if (ps.chargeBreakdown.length > 0) {
        ps.chargeBreakdown.forEach((cb) => {
          lines.push(
            `  + ${cb.chargeName}  →  ${formatCurrency(cb.amount, currency)}`,
          );
        });
      }
      if (ps.originalTotal !== undefined && ps.originalTotal !== ps.total) {
        lines.push(
          `  Total awal: ${formatCurrency(ps.originalTotal, currency)}`,
        );
      }
      if ((ps.contributionAmount ?? 0) > 0) {
        lines.push(
          `  Kontribusi: ${formatCurrency(ps.contributionAmount ?? 0, currency)}`,
        );
      } else if ((ps.coveredAmount ?? 0) > 0) {
        lines.push(
          `  Dibantu: -${formatCurrency(ps.coveredAmount ?? 0, currency)}`,
        );
      }
      lines.push(`  ━ Bayar akhir: ${formatCurrency(ps.total, currency)}`);
      lines.push("");
    });
    lines.push(`💰 Grand Total: ${formatCurrency(grandTotal, currency)}`);
    if (hasContributions) {
      lines.push(
        `🤝 Total kontribusi: ${formatCurrency(contributionTotal, currency)}`,
      );
    }
    if (paymentMethods.length > 0) {
      lines.push("");
      lines.push("💳 Pembayaran:");
      paymentMethods.forEach((pm) => {
        const parts = [
          pm.label,
          pm.accountNumber,
          pm.accountName,
          pm.additionalInfo,
        ].filter(Boolean);
        lines.push(`  • ${parts.join(" · ")}`);
      });
    }
    if (shareLink) {
      lines.push("");
      lines.push(`🔗 ${shareLink}`);
    }
    lines.push("");
    lines.push("Made with equall ⚖️");
    navigator.clipboard.writeText(lines.join("\n"));
    showToast(t("summary.toastTextCopied"), "success");
  };

  const handleDownload = async () => {
    if (!summaryRef.current) return;
    setIsExporting(true);
    try {
      const url = await toPng(summaryRef.current, {
        backgroundColor: "#f8fafc",
        pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `equall-${session?.slug ?? "summary"}.png`;
      a.click();
      showToast(t("summary.toastDownloaded"), "success");
    } catch {
      showToast(t("summary.toastDownloadFail"), "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PageLayout
      currentStep={6}
      title={t("summary.pageTitle")}
      subtitle={t("summary.pageSubtitle")}
    >
      <TutorialTip text={t("summary.tutorialSummary")} className="mb-4">
      <div ref={summaryRef} className="space-y-4">
        {/* Session Info */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-indigo-200 text-xs font-medium">
                {t("summary.sessionLabel")}
              </p>
              <h2 className="text-lg font-bold mt-0.5">{session?.name}</h2>
              <p className="text-indigo-200 text-xs mt-1">
                {new Date().toLocaleDateString(
                  i18n.language?.startsWith("id") ? "id-ID" : "en-US",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-indigo-200 text-xs">
                {t("summary.grandTotal")}
              </p>
              <p className="text-xl font-black">
                {formatCurrency(grandTotal, currency)}
              </p>
              {hasContributions && (
                <p className="text-indigo-200 text-xs">
                  {t("summary.contributionTotal", {
                    amount: formatCurrency(contributionTotal, currency),
                  })}
                </p>
              )}
              <p className="text-indigo-200 text-xs">
                {t("summary.peopleCount", { count: persons.length })}
              </p>
            </div>
          </div>
        </div>

        {/* Per Person */}
        {summaries.map((ps, idx) => (
          <motion.div
            key={ps.person.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            {/* Person Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                  {ps.person.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-100">
                    {ps.person.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("summary.itemCount", {
                      count: ps.person.claimedItems.length,
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-indigo-600">
                  {formatCurrency(ps.total, currency)}
                </p>
                {ps.originalTotal !== undefined &&
                  ps.originalTotal !== ps.total && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t("summary.originalTotal", {
                        amount: formatCurrency(ps.originalTotal, currency),
                      })}
                    </p>
                  )}
              </div>
            </div>

            {/* Item Breakdown */}
            <div className="px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t("summary.itemsLabel")}
              </p>
              {ps.person.claimedItems.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                  {t("summary.noItems")}
                </p>
              ) : (
                ps.person.claimedItems.map((ci) => (
                  <div key={ci.menuId} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      {ci.name}{" "}
                      <span className="text-gray-400 dark:text-gray-500">
                        ×{ci.qty}
                      </span>
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {formatCurrency(ci.subtotal, currency)}
                    </span>
                  </div>
                ))
              )}
              <div className="flex justify-between text-sm font-semibold pt-1 border-t border-gray-100 dark:border-gray-800">
                <span className="text-gray-700 dark:text-gray-200">
                  {t("summary.subtotalLabel")}
                </span>
                <span className="text-gray-800 dark:text-gray-100">
                  {formatCurrency(ps.itemSubtotal, currency)}
                </span>
              </div>
            </div>

            {/* Charges Breakdown */}
            {ps.chargeBreakdown.length > 0 && (
              <div className="px-4 pb-3 space-y-1.5 border-t border-gray-50 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pt-2">
                  {t("summary.chargesLabel")}
                </p>
                {ps.chargeBreakdown.map((cb) => (
                  <div
                    key={cb.chargeId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-gray-500 dark:text-gray-400">
                      {cb.chargeName}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      +{formatCurrency(cb.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {hasContributions &&
              ((ps.contributionAmount ?? 0) > 0 ||
                (ps.coveredAmount ?? 0) > 0) && (
                <div className="px-4 pb-3 space-y-1.5 border-t border-gray-50 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pt-2">
                    {t("summary.contributionsLabel")}
                  </p>
                  {(ps.contributionAmount ?? 0) > 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t("summary.contributionPaid")}
                      </span>
                      <span className="text-emerald-600 font-semibold">
                        {formatCurrency(ps.contributionAmount ?? 0, currency)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t("summary.contributionCovered")}
                      </span>
                      <span className="text-emerald-600 font-semibold">
                        -{formatCurrency(ps.coveredAmount ?? 0, currency)}
                      </span>
                    </div>
                  )}
                </div>
              )}

            {/* Total */}
            <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 flex justify-between items-center border-t border-indigo-100 dark:border-indigo-900">
              <span className="font-bold text-gray-700 dark:text-gray-200">
                {t("summary.totalLabel")}
              </span>
              <span className="text-lg font-black text-indigo-600">
                {formatCurrency(ps.total, currency)}
              </span>
            </div>
          </motion.div>
        ))}

        {/* Payment Methods */}
        {paymentMethods.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
              {t("summary.paymentTitle")}
            </h3>
            <div className="space-y-2">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm"
                >
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    {pm.label}
                  </p>
                  {pm.accountNumber && (
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      {pm.accountNumber}
                    </p>
                  )}
                  {pm.accountName && (
                    <p className="text-gray-500 dark:text-gray-400">
                      {pm.accountName}
                    </p>
                  )}
                  {pm.additionalInfo && (
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                      {pm.additionalInfo}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </TutorialTip>

      {/* Share Link */}
      {shareLink && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4"
        >
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
            {t("summary.linkReady")}
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareLink}
              className="flex-1 text-xs bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-300"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
            >
              {t("common.copyLink")}
            </button>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <TutorialTip text={t("summary.tutorialShareActions")} className="mt-6">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/payment")}
            className="py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t("summary.editBtn")}
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="py-3 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-semibold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors disabled:opacity-60"
          >
            {isExporting
              ? `⏳ ${t("common.downloading")}`
              : t("summary.downloadBtn")}
          </button>
        </div>
        <button
          onClick={handleCopyText}
          className="w-full py-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-semibold text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
        >
          {t("summary.copyTextBtn")}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold shadow-lg hover:shadow-xl transition-shadow disabled:opacity-60"
        >
          {isSaving ? (
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
              {t("common.saving")}
            </span>
          ) : (
            t("summary.saveShareBtn")
          )}
        </button>
      </div>
      </TutorialTip>
    </PageLayout>
  );
}
