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
import type { MenuItem } from "../types";

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.95, y: -10 },
};

type PriceMode = "unit" | "total";

interface FormState {
  name: string;
  totalQty: string;
  priceMode: PriceMode;
  pricePerUnit: string;
  totalPrice: string;
}

const defaultForm: FormState = {
  name: "",
  totalQty: "1",
  priceMode: "unit",
  pricePerUnit: "",
  totalPrice: "",
};

export default function MenuPool() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const session = useStore((s) => s.session);
  const menuPool = useStore((s) => s.menuPool);
  const addMenuItem = useStore((s) => s.addMenuItem);
  const removeMenuItem = useStore((s) => s.removeMenuItem);
  const updateMenuItem = useStore((s) => s.updateMenuItem);
  const setCurrentStep = useStore((s) => s.setCurrentStep);

  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const currency = session?.currency ?? "IDR";

  const computedPreview = () => {
    const qty = parseFloat(form.totalQty) || 0;
    if (form.priceMode === "unit") {
      const unit = parseFloat(form.pricePerUnit) || 0;
      return { pricePerUnit: unit, total: unit * qty };
    } else {
      const total = parseFloat(form.totalPrice) || 0;
      return { pricePerUnit: qty > 0 ? total / qty : 0, total };
    }
  };

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "priceMode") {
        next.pricePerUnit = "";
        next.totalPrice = "";
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(form.totalQty);
    if (!form.name.trim()) {
      showToast(t("menuPool.validationName"), "error");
      return;
    }
    if (!qty || qty < 1) {
      showToast(t("menuPool.validationQty"), "error");
      return;
    }
    const { pricePerUnit, total } = computedPreview();
    if (pricePerUnit <= 0) {
      showToast(t("menuPool.validationPrice"), "error");
      return;
    }

    if (editingId) {
      updateMenuItem(editingId, {
        name: form.name.trim(),
        totalQty: qty,
        pricePerUnit,
        totalPrice: total,
      });
      showToast(t("menuPool.toastUpdated"), "success");
      setEditingId(null);
    } else {
      addMenuItem(form.name.trim(), qty, pricePerUnit);
      showToast(t("menuPool.toastAdded"), "success");
    }
    setForm(defaultForm);
    setShowForm(false);
  };

  const handleEdit = (item: MenuItem) => {
    setForm({
      name: item.name,
      totalQty: String(item.totalQty),
      priceMode: "unit",
      pricePerUnit: String(item.pricePerUnit),
      totalPrice: String(item.totalPrice),
    });
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    removeMenuItem(id);
    setDeleteConfirm(null);
    showToast(t("menuPool.toastDeleted"), "success");
  };

  const handleNext = () => {
    if (menuPool.length === 0) {
      showToast(t("menuPool.validationMinItem"), "error");
      return;
    }
    setCurrentStep(3);
    navigate("/assign");
  };

  const preview = computedPreview();

  return (
    <PageLayout
      currentStep={2}
      title={t("menuPool.pageTitle")}
      subtitle={t("menuPool.pageSubtitle")}
    >
      {/* Add/Edit Form */}
      <TutorialTip
        text={t("menuPool.tutorialAddItem")}
        className="mb-4"
      >
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
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            {editingId ? t("menuPool.editItem") : t("menuPool.addItem")}
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
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                    {t("menuPool.itemNameLabel")}
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder={t("menuPool.itemNamePlaceholder")}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                    {t("menuPool.totalQtyLabel")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.totalQty}
                    onChange={(e) =>
                      handleFieldChange("totalQty", e.target.value)
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <TutorialTip text={t("menuPool.tutorialPriceMode")}>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 block">
                    {t("menuPool.priceModeLabel")}
                  </label>
                  <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {(["unit", "total"] as PriceMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleFieldChange("priceMode", mode)}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${
                          form.priceMode === mode
                            ? "bg-indigo-500 text-white"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {mode === "unit"
                          ? t("menuPool.priceUnitMode")
                          : t("menuPool.priceTotalMode")}
                      </button>
                    ))}
                  </div>
                </TutorialTip>

                {form.priceMode === "unit" ? (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                      {t("menuPool.pricePerUnitLabel")}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={form.pricePerUnit}
                      onChange={(e) =>
                        handleFieldChange("pricePerUnit", e.target.value)
                      }
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                      {t("menuPool.priceTotalLabel")}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={form.totalPrice}
                      onChange={(e) =>
                        handleFieldChange("totalPrice", e.target.value)
                      }
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                )}

                {/* Preview */}
                {(form.pricePerUnit || form.totalPrice) && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-3 text-sm">
                    <div className="flex justify-between text-indigo-700 dark:text-indigo-300">
                      <span>{t("menuPool.previewPerUnit")}</span>
                      <span className="font-semibold">
                        {formatCurrency(preview.pricePerUnit, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-indigo-700 dark:text-indigo-300 mt-1">
                      <span>
                        {t("menuPool.previewTotal", {
                          qty: form.totalQty || 0,
                        })}
                      </span>
                      <span className="font-bold">
                        {formatCurrency(preview.total, currency)}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
                >
                  {editingId ? t("common.save") : t("menuPool.addItemBtn")}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      </TutorialTip>

      {/* Item List */}
      <TutorialTip text={t("menuPool.tutorialItemList")} className="mb-6">
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {menuPool.length === 0 ? (
            <EmptyState
              icon="🍽️"
              title={t("menuPool.emptyTitle")}
              description={t("menuPool.emptyDesc")}
            />
          ) : (
            menuPool.map((item) => (
              <motion.div
                key={item.id}
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {item.name}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {formatCurrency(item.pricePerUnit, currency)} / pcs
                      </span>
                      <span>
                        Total: {formatCurrency(item.totalPrice, currency)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(item)}
                      className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition-colors text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${((item.totalQty - item.remainingQty) / item.totalQty) * 100}%`,
                      }}
                      className="h-full bg-emerald-400 rounded-full"
                    />
                  </div>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      item.remainingQty === 0
                        ? "text-emerald-600"
                        : item.remainingQty <= Math.ceil(item.totalQty * 0.3)
                          ? "text-amber-500"
                          : "text-gray-500"
                    }`}
                  >
                    {t("menuPool.remainingLabel", {
                      remaining: item.remainingQty,
                      total: item.totalQty,
                    })}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
      </TutorialTip>

      {/* Footer */}
      <div className="sticky bottom-4">
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold shadow-lg hover:shadow-xl transition-shadow"
        >
          {t("menuPool.nextBtn")}
        </button>
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title={t("menuPool.deleteTitle")}
        message={t("menuPool.deleteMsg")}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </PageLayout>
  );
}
