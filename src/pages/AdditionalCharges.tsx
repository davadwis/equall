import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useStore } from "../store/useStore";
import { useToast } from "../components/Toast";
import PageLayout from "../components/PageLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import TutorialTip from "../components/TutorialTip";
import { formatCurrency } from "../lib/formatters";
import type {
  Charge,
  ChargeType,
  ChargeMethod,
  ChargeApplyTo,
  ChargeDistribution,
} from "../types";

const CHARGE_TYPES: ChargeType[] = ["Tax", "Service Charge", "Tip", "Custom"];

const defaultForm = {
  type: "Tax" as ChargeType,
  name: "",
  method: "percentage" as ChargeMethod,
  value: "",
  applyTo: "items" as ChargeApplyTo,
  distribution: "proportional" as ChargeDistribution,
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95 },
};

export default function AdditionalCharges() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const session = useStore((s) => s.session);
  const charges = useStore((s) => s.charges);
  const menuPool = useStore((s) => s.menuPool);
  const addCharge = useStore((s) => s.addCharge);
  const updateCharge = useStore((s) => s.updateCharge);
  const removeCharge = useStore((s) => s.removeCharge);
  const setCurrentStep = useStore((s) => s.setCurrentStep);

  const currency = session?.currency ?? "IDR";

  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const totalMenuPrice = menuPool.reduce((s, m) => s + m.totalPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(form.value);
    if (!val || val <= 0) {
      showToast(t("charges.validationValue"), "error");
      return;
    }
    if (form.method === "percentage" && val > 100) {
      showToast(t("charges.validationPercent"), "error");
      return;
    }
    const chargeName = form.type === "Custom" ? form.name : form.type;
    if (!chargeName.trim()) {
      showToast(t("charges.validationName"), "error");
      return;
    }

    const payload: Omit<Charge, "id"> = {
      type: form.type,
      name: chargeName,
      method: form.method,
      value: val,
      applyTo: form.applyTo,
      distribution: form.distribution,
    };

    if (editingId) {
      updateCharge(editingId, payload);
      showToast(t("charges.toastUpdated"), "success");
      setEditingId(null);
    } else {
      addCharge(payload);
      showToast(t("charges.toastAdded"), "success");
    }
    setForm(defaultForm);
    setShowForm(false);
  };

  const handleEdit = (charge: Charge) => {
    setForm({
      type: charge.type,
      name: charge.name,
      method: charge.method,
      value: String(charge.value),
      applyTo: charge.applyTo,
      distribution: charge.distribution,
    });
    setEditingId(charge.id);
    setShowForm(true);
  };

  const handleNext = () => {
    setCurrentStep(5);
    navigate("/payment");
  };

  const totalCharges = charges.reduce((sum, charge) => {
    const base = charge.applyTo === "items" ? totalMenuPrice : totalMenuPrice;
    const amount =
      charge.method === "percentage"
        ? base * (charge.value / 100)
        : charge.value;
    return sum + amount;
  }, 0);

  return (
    <PageLayout
      currentStep={4}
      title={t("charges.pageTitle")}
      subtitle={t("charges.pageSubtitle")}
    >
      {/* Summary Banner */}
      <TutorialTip text={t("charges.tutorialChargesSummary")} className="mb-4">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-4 text-white">
        <div className="flex justify-between">
          <div>
            <p className="text-indigo-100 text-xs">{t("charges.totalMenu")}</p>
            <p className="text-lg font-bold">
              {formatCurrency(totalMenuPrice, currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-indigo-100 text-xs">
              {t("charges.totalCharges")}
            </p>
            <p className="text-lg font-bold">
              +{formatCurrency(totalCharges, currency)}
            </p>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-white/20 flex justify-between">
          <span className="text-sm font-medium text-indigo-100">
            {t("charges.grandTotal")}
          </span>
          <span className="text-base font-bold">
            {formatCurrency(totalMenuPrice + totalCharges, currency)}
          </span>
        </div>
      </div>
      </TutorialTip>

      {/* Form */}
      <TutorialTip text={t("charges.tutorialChargeForm")} className="mb-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <button
          onClick={() => {
            if (editingId) {
              setEditingId(null);
              setForm(defaultForm);
            }
            setShowForm((v) => !v);
          }}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="font-semibold text-gray-800">
            {editingId ? t("charges.editCharge") : t("charges.addCharge")}
          </span>
          <motion.span
            animate={{ rotate: showForm ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400 dark:text-gray-500"
          >
            ▼
          </motion.span>
        </button>

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSubmit}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                {/* Type */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                    {t("charges.typeLabel")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CHARGE_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, type: t }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          form.type === t
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom name */}
                {form.type === "Custom" && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                      {t("charges.customNameLabel")}
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder={t("charges.customNamePlaceholder")}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                )}

                {/* Method */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                    {t("charges.methodLabel")}
                  </label>
                  <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {(["percentage", "nominal"] as ChargeMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, method: m }))
                        }
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${
                          form.method === m
                            ? "bg-indigo-500 text-white"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {m === "percentage"
                          ? t("charges.percentageMethod")
                          : t("charges.nominalMethod")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Value */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                    {t("charges.valueLabel", {
                      hint:
                        form.method === "percentage"
                          ? t("charges.valueLabelPercentHint")
                          : "",
                    })}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={form.method === "percentage" ? 100 : undefined}
                      step="any"
                      value={form.value}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, value: e.target.value }))
                      }
                      placeholder="0"
                      className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium w-6">
                      {form.method === "percentage" ? "%" : ""}
                    </span>
                  </div>
                </div>

                {/* Apply to */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                    {t("charges.applyToLabel")}
                  </label>
                  <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {(["items", "total"] as ChargeApplyTo[]).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, applyTo: a }))
                        }
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${
                          form.applyTo === a
                            ? "bg-indigo-500 text-white"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {a === "items"
                          ? t("charges.applyToItems")
                          : t("charges.applyToTotal")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distribution */}
                <TutorialTip text={t("charges.tutorialChargeDistribution")}>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                    {t("charges.distributionLabel")}
                  </label>
                  <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {(["proportional", "equal"] as ChargeDistribution[]).map(
                      (d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, distribution: d }))
                          }
                          className={`flex-1 py-2 text-sm font-medium transition-colors ${
                            form.distribution === d
                              ? "bg-indigo-500 text-white"
                              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          {d === "proportional"
                            ? t("charges.proportional")
                            : t("charges.equalSplit")}
                        </button>
                      ),
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {form.distribution === "proportional"
                      ? t("charges.proportionalHint")
                      : t("charges.equalHint")}
                  </p>
                </TutorialTip>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
                >
                  {editingId ? t("common.save") : t("charges.addChargeBtn")}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      </TutorialTip>

      {/* Charge Cards */}
      <div className="space-y-3 mb-6">
        <AnimatePresence mode="popLayout">
          {charges.length === 0 ? (
            <EmptyState
              icon="💰"
              title={t("charges.emptyTitle")}
              description={t("charges.emptyDesc")}
            />
          ) : (
            charges.map((charge, idx) => (
              <motion.div
                key={charge.id}
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        {charge.name}
                      </span>
                      <span className="text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                        {charge.type}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {charge.method === "percentage"
                          ? `${charge.value}%`
                          : formatCurrency(charge.value, currency)}
                      </span>
                      <span>
                        dari{" "}
                        {charge.applyTo === "items"
                          ? t("charges.fromItems")
                          : t("charges.fromTotal")}
                      </span>
                      <span>
                        {charge.distribution === "equal"
                          ? t("charges.distRata")
                          : t("charges.distProporsional")}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      ≈{" "}
                      {formatCurrency(
                        charge.method === "percentage"
                          ? totalMenuPrice * (charge.value / 100)
                          : charge.value,
                        currency,
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(charge)}
                      className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(charge.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="sticky bottom-4">
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold shadow-lg hover:shadow-xl transition-shadow"
        >
          {t("charges.nextBtn")}
        </button>
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title={t("charges.deleteTitle")}
        message={t("charges.deleteMsg")}
        onConfirm={() => {
          if (deleteConfirm) {
            removeCharge(deleteConfirm);
            setDeleteConfirm(null);
            showToast(t("charges.toastDeleted"), "success");
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </PageLayout>
  );
}
