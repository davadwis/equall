import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import { useTranslation } from "react-i18next";
import { fetchSession } from "../lib/supabase";
import { useToast } from "../components/Toast";
import { formatCurrency } from "../lib/formatters";
import { calculatePersonSummaries } from "../lib/calculations";
import type { SplitBillState } from "../types";

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { t, i18n } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<SplitBillState | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [notFound, setNotFound] = useState(!id);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    fetchSession(id)
      .then((result) => {
        if (!result) {
          setNotFound(true);
        } else {
          setData(result);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast(t("share.toastCopied"), "success");
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `${t("share.waMessage")}${window.location.href}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleCopyText = () => {
    if (!data) return;
    const currency = data.session?.currency ?? "IDR";
    const summaries = calculatePersonSummaries(
      data.persons,
      data.charges,
      data.menuPool,
      data.session?.splitMode,
      data.paymentContributions ?? [],
    );
    const grandTotal = summaries.reduce((s, ps) => s + ps.total, 0);
    const hasContributions = (data.paymentContributions ?? []).length > 0;
    const contributionTotal = summaries.reduce(
      (sum, ps) => sum + (ps.contributionAmount ?? 0),
      0,
    );
    const lines: string[] = [];
    lines.push(`🧾 ${data.session?.name ?? ""}`);
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
    if (data.paymentMethods.length > 0) {
      lines.push("");
      lines.push("💳 Pembayaran:");
      data.paymentMethods.forEach((pm) => {
        const parts = [
          pm.label,
          pm.accountNumber,
          pm.accountName,
          pm.additionalInfo,
        ].filter(Boolean);
        lines.push(`  • ${parts.join(" · ")}`);
      });
    }
    lines.push("");
    lines.push(`🔗 ${window.location.href}`);
    lines.push("");
    lines.push("Made with equall ⚖️");
    navigator.clipboard.writeText(lines.join("\n"));
    showToast(t("share.toastTextCopied"), "success");
  };

  const handleDownload = async () => {
    if (!contentRef.current) return;
    setIsExporting(true);
    try {
      const url = await toPng(contentRef.current, {
        backgroundColor: "#f8fafc",
        pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `equall-${id}.png`;
      a.click();
      showToast(t("share.toastDownloaded"), "success");
    } catch {
      showToast(t("share.toastDownloadFail"), "error");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-950 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">⚖️</div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {t("share.loadingText")}
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-950 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">
            {t("share.notFoundTitle")}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            {t("share.notFoundDesc")}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-indigo-500 text-white rounded-xl font-semibold hover:bg-indigo-600 transition-colors"
          >
            {t("share.createNewBtn")}
          </a>
        </div>
      </div>
    );
  }

  const {
    session,
    persons,
    charges,
    paymentMethods,
    paymentContributions = [],
  } = data;
  const currency = session?.currency ?? "IDR";
  const summaries = calculatePersonSummaries(
    persons,
    charges,
    data.menuPool,
    session?.splitMode,
    paymentContributions,
  );
  const grandTotal = summaries.reduce((s, ps) => s + ps.total, 0);
  const hasContributions = paymentContributions.length > 0;
  const contributionTotal = summaries.reduce(
    (sum, ps) => sum + (ps.contributionAmount ?? 0),
    0,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 pt-8 pb-12">
        <div className="max-w-md mx-auto text-center">
          <div className="text-3xl font-black tracking-tight mb-1">
            ⚖️ equall
          </div>
          <p className="text-indigo-200 text-xs">split bill</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-8">
        <div ref={contentRef} className="space-y-4">
          {/* Session Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-5"
          >
            <h1 className="text-xl font-black text-gray-800 dark:text-gray-100">
              {session?.name}
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
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
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t("share.grandTotal")}
              </span>
              <div className="text-right">
                <span className="text-lg font-black text-indigo-600 block">
                  {formatCurrency(grandTotal, currency)}
                </span>
                {hasContributions && (
                  <span className="text-xs text-emerald-600 font-semibold">
                    {t("share.contributionTotal", {
                      amount: formatCurrency(contributionTotal, currency),
                    })}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Per Person */}
          {summaries.map((ps, idx) => (
            <motion.div
              key={ps.person.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                    {ps.person.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-gray-800 dark:text-gray-100">
                    {ps.person.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-indigo-600 block">
                    {formatCurrency(ps.total, currency)}
                  </span>
                  {ps.originalTotal !== undefined &&
                    ps.originalTotal !== ps.total && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {t("share.originalTotal", {
                          amount: formatCurrency(ps.originalTotal, currency),
                        })}
                      </span>
                    )}
                </div>
              </div>

              <div className="px-4 py-3 space-y-1">
                {ps.person.claimedItems.map((ci) => (
                  <div key={ci.menuId} className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      {ci.name} ×{ci.qty}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatCurrency(ci.subtotal, currency)}
                    </span>
                  </div>
                ))}
                {ps.chargeBreakdown
                  .filter((cb) => cb.amount > 0)
                  .map((cb) => (
                    <div
                      key={cb.chargeId}
                      className="flex justify-between text-xs text-gray-400 dark:text-gray-500"
                    >
                      <span>{cb.chargeName}</span>
                      <span>+{formatCurrency(cb.amount, currency)}</span>
                    </div>
                  ))}
                {hasContributions &&
                  ((ps.contributionAmount ?? 0) > 0 ||
                    (ps.coveredAmount ?? 0) > 0) && (
                    <div className="flex justify-between text-xs text-emerald-600 font-semibold pt-1 border-t border-gray-100 dark:border-gray-800">
                      <span>
                        {(ps.contributionAmount ?? 0) > 0
                          ? t("share.contributionPaid")
                          : t("share.contributionCovered")}
                      </span>
                      <span>
                        {(ps.contributionAmount ?? 0) > 0
                          ? formatCurrency(ps.contributionAmount ?? 0, currency)
                          : `-${formatCurrency(ps.coveredAmount ?? 0, currency)}`}
                      </span>
                    </div>
                  )}
              </div>
            </motion.div>
          ))}

          {/* Payment Methods */}
          {paymentMethods.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4"
            >
              <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 text-sm">
                {t("share.paymentTitle")}
              </h3>
              <div className="space-y-2">
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="bg-indigo-50 dark:bg-indigo-950/40 rounded-xl p-3"
                  >
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                      {pm.label}
                    </p>
                    {pm.accountNumber && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
                        {pm.accountNumber}
                      </p>
                    )}
                    {pm.accountName && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
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
            </motion.div>
          )}

          {/* Branding */}
          <div className="text-center py-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t("share.branding")}{" "}
              <span className="font-semibold text-indigo-500">equall</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-3 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopyLink}
              className="py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              🔗 {t("common.copyLink")}
            </button>
            <button
              onClick={handleWhatsApp}
              className="py-3 rounded-2xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors"
            >
              💬 {t("common.shareWA")}
            </button>
          </div>
          <button
            onClick={handleCopyText}
            className="w-full py-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-semibold text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
          >
            {t("share.copyTextBtn")}
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="w-full py-3 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-semibold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors disabled:opacity-60"
          >
            {isExporting
              ? `⏳ ${t("common.downloading")}`
              : t("common.downloadImage")}
          </button>
          <a
            href="/"
            className="block text-center py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold shadow-md hover:shadow-lg transition-shadow"
          >
            ⚖️ {t("common.createNew")}
          </a>
        </div>
      </div>
    </div>
  );
}
