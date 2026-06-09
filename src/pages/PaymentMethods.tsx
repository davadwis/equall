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
import { calculatePersonSummaries } from "../lib/calculations";
import type { PaymentContribution, PaymentMethod, PaymentType } from "../types";

const PAYMENT_TYPE_BASES: { value: PaymentType; icon: string }[] = [
  { value: "bank_transfer", icon: "🏦" },
  { value: "ewallet", icon: "💳" },
  { value: "paypal", icon: "🅿️" },
  { value: "crypto", icon: "₿" },
  { value: "custom", icon: "✨" },
];

const defaultForm = {
  type: "bank_transfer" as PaymentType,
  label: "",
  accountNumber: "",
  accountName: "",
  additionalInfo: "",
};

const defaultContributionForm = {
  personId: "",
  amount: "",
  note: "",
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95 },
};

export default function PaymentMethods() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const getPaymentLabel = (value: PaymentType): string => {
    const keyMap: Record<PaymentType, string> = {
      bank_transfer: t("payment.typeBankTransfer"),
      ewallet: t("payment.typeEwallet"),
      paypal: t("payment.typePaypal"),
      crypto: t("payment.typeCrypto"),
      custom: t("payment.typeCustom"),
    };
    return keyMap[value] ?? value;
  };

  const getPaymentFields = (value: PaymentType): string[] => {
    const fieldsMap: Record<PaymentType, string[]> = {
      bank_transfer: t("payment.bankFields", {
        returnObjects: true,
      }) as string[],
      ewallet: t("payment.ewalletFields", { returnObjects: true }) as string[],
      paypal: t("payment.paypalFields", { returnObjects: true }) as string[],
      crypto: t("payment.cryptoFields", { returnObjects: true }) as string[],
      custom: t("payment.customFields", { returnObjects: true }) as string[],
    };
    return fieldsMap[value] ?? [];
  };

  const PAYMENT_TYPES = PAYMENT_TYPE_BASES.map((base) => ({
    ...base,
    label: getPaymentLabel(base.value),
    fields: getPaymentFields(base.value),
  }));

  const paymentMethods = useStore((s) => s.paymentMethods);
  const session = useStore((s) => s.session);
  const persons = useStore((s) => s.persons);
  const menuPool = useStore((s) => s.menuPool);
  const charges = useStore((s) => s.charges);
  const paymentContributions = useStore((s) => s.paymentContributions);
  const addPaymentMethod = useStore((s) => s.addPaymentMethod);
  const updatePaymentMethod = useStore((s) => s.updatePaymentMethod);
  const removePaymentMethod = useStore((s) => s.removePaymentMethod);
  const addPaymentContribution = useStore((s) => s.addPaymentContribution);
  const updatePaymentContribution = useStore(
    (s) => s.updatePaymentContribution,
  );
  const removePaymentContribution = useStore(
    (s) => s.removePaymentContribution,
  );
  const setCurrentStep = useStore((s) => s.setCurrentStep);

  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [contributionForm, setContributionForm] = useState(
    defaultContributionForm,
  );
  const [editingContributionId, setEditingContributionId] = useState<
    string | null
  >(null);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [deleteContributionConfirm, setDeleteContributionConfirm] = useState<
    string | null
  >(null);

  const selectedType = PAYMENT_TYPES.find((t) => t.value === form.type)!;
  const currency = session?.currency ?? "IDR";
  const baseSummaries = calculatePersonSummaries(
    persons,
    charges,
    menuPool,
    session?.splitMode,
  );
  const grandTotal = baseSummaries.reduce((sum, ps) => sum + ps.total, 0);
  const contributionTotal = Math.min(
    grandTotal,
    paymentContributions.reduce(
      (sum, contribution) => sum + contribution.amount,
      0,
    ),
  );
  const remainingTotal = Math.max(0, grandTotal - contributionTotal);
  const personNameById = new Map(
    persons.map((person) => [person.id, person.name]),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) {
      showToast(t("payment.validationFirst"), "error");
      return;
    }

    const payload: Omit<PaymentMethod, "id"> = {
      type: form.type,
      label: form.label.trim(),
      accountNumber: form.accountNumber.trim(),
      accountName: form.accountName.trim(),
      additionalInfo: form.additionalInfo.trim(),
    };

    if (editingId) {
      updatePaymentMethod(editingId, payload);
      showToast(t("payment.toastUpdated"), "success");
      setEditingId(null);
    } else {
      addPaymentMethod(payload);
      showToast(t("payment.toastAdded"), "success");
    }
    setForm(defaultForm);
    setShowForm(false);
  };

  const handleEdit = (pm: PaymentMethod) => {
    setForm({
      type: pm.type,
      label: pm.label,
      accountNumber: pm.accountNumber,
      accountName: pm.accountName,
      additionalInfo: pm.additionalInfo,
    });
    setEditingId(pm.id);
    setShowForm(true);
  };

  const handleContributionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPersonId = contributionForm.personId || persons[0]?.id || "";
    const amount = parseFloat(contributionForm.amount);
    if (!selectedPersonId) {
      showToast(t("payment.contributionValidationPerson"), "error");
      return;
    }
    if (!amount || amount <= 0) {
      showToast(t("payment.contributionValidationAmount"), "error");
      return;
    }

    const otherContributionTotal = paymentContributions.reduce(
      (sum, contribution) =>
        contribution.id === editingContributionId
          ? sum
          : sum + contribution.amount,
      0,
    );
    if (otherContributionTotal + amount > grandTotal) {
      showToast(t("payment.contributionValidationLimit"), "error");
      return;
    }

    const payload: Omit<PaymentContribution, "id"> = {
      personId: selectedPersonId,
      amount,
      note: contributionForm.note.trim(),
    };

    if (editingContributionId) {
      updatePaymentContribution(editingContributionId, payload);
      showToast(t("payment.contributionToastUpdated"), "success");
      setEditingContributionId(null);
    } else {
      addPaymentContribution(payload);
      showToast(t("payment.contributionToastAdded"), "success");
    }
    setContributionForm(defaultContributionForm);
    setShowContributionForm(false);
  };

  const handleContributionEdit = (contribution: PaymentContribution) => {
    setContributionForm({
      personId: contribution.personId,
      amount: String(contribution.amount),
      note: contribution.note,
    });
    setEditingContributionId(contribution.id);
    setShowContributionForm(true);
  };

  const handleNext = () => {
    setCurrentStep(6);
    navigate("/summary");
  };

  const getTypeInfo = (type: PaymentType) =>
    PAYMENT_TYPES.find((t) => t.value === type) ?? PAYMENT_TYPES[4];

  const renderPmDetail = (pm: PaymentMethod) => {
    const parts = [
      pm.label,
      pm.accountNumber,
      pm.accountName,
      pm.additionalInfo,
    ].filter(Boolean);
    return parts.join(" · ");
  };

  return (
    <PageLayout
      currentStep={5}
      title={t("payment.pageTitle")}
      subtitle={t("payment.pageSubtitle")}
    >
      <TutorialTip text={t("payment.tutorialContribution")} className="mb-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("payment.contributionGrandTotal")}
              </p>
              <p className="text-base font-bold text-gray-800 dark:text-gray-100">
                {formatCurrency(grandTotal, currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("payment.contributionCoveredTotal")}
              </p>
              <p className="text-base font-bold text-emerald-600">
                {formatCurrency(contributionTotal, currency)}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t("payment.contributionRemaining")}
            </span>
            <span className="text-sm font-bold text-indigo-600">
              {formatCurrency(remainingTotal, currency)}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            if (editingContributionId) {
              setEditingContributionId(null);
              setContributionForm(defaultContributionForm);
            }
            setShowContributionForm((v) => !v);
          }}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            {editingContributionId
              ? t("payment.editContribution")
              : t("payment.addContribution")}
          </span>
          <motion.span
            animate={{ rotate: showContributionForm ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400 dark:text-gray-500"
          >
            â–¼
          </motion.span>
        </button>

        <AnimatePresence>
          {showContributionForm && (
            <motion.form
              initial={{ height: 0, opacity: 1 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleContributionSubmit}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                    {t("payment.contributionPersonLabel")}
                  </label>
                  <select
                    value={contributionForm.personId || persons[0]?.id || ""}
                    onChange={(e) =>
                      setContributionForm((prev) => ({
                        ...prev,
                        personId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {persons.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                    {t("payment.contributionAmountLabel")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={contributionForm.amount}
                    onChange={(e) =>
                      setContributionForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                    {t("payment.contributionNoteLabel")}
                  </label>
                  <input
                    type="text"
                    value={contributionForm.note}
                    onChange={(e) =>
                      setContributionForm((prev) => ({
                        ...prev,
                        note: e.target.value,
                      }))
                    }
                    placeholder={t("payment.contributionNotePlaceholder")}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
                >
                  {editingContributionId
                    ? t("common.save")
                    : t("payment.addContributionBtn")}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      </TutorialTip>

      <div className="space-y-3 mb-6">
        <AnimatePresence mode="popLayout">
          {paymentContributions.length > 0 &&
            paymentContributions.map((contribution, idx) => (
              <motion.div
                key={contribution.id}
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                    %
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                      {personNameById.get(contribution.personId) ??
                        t("payment.unknownPerson")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatCurrency(contribution.amount, currency)}
                      {contribution.note ? ` · ${contribution.note}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleContributionEdit(contribution)}
                      className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 text-sm"
                    >
                      âœï¸
                    </button>
                    <button
                      onClick={() =>
                        setDeleteContributionConfirm(contribution.id)
                      }
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 text-sm"
                    >
                      ðŸ—‘ï¸
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Form */}
      <TutorialTip text={t("payment.tutorialPayment")} className="mb-4">
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
            {editingId ? t("payment.editMethod") : t("payment.addMethod")}
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
                {/* Type selection */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 block">
                    {t("payment.typeLabel")}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {PAYMENT_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() =>
                          setForm({ ...defaultForm, type: t.value })
                        }
                        className={`flex flex-col items-center py-2 px-1 rounded-xl border text-xs font-medium transition-colors ${
                          form.type === t.value
                            ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                            : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-200 dark:hover:border-indigo-700"
                        }`}
                      >
                        <span className="text-xl mb-1">{t.icon}</span>
                        <span className="text-center leading-tight">
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic fields */}
                {selectedType.fields.map((fieldLabel, idx) => {
                  const fieldKeys = [
                    "label",
                    "accountNumber",
                    "accountName",
                    "additionalInfo",
                  ] as const;
                  const key = fieldKeys[idx];
                  return (
                    <div key={fieldLabel}>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                        {fieldLabel}
                      </label>
                      <input
                        type="text"
                        value={form[key]}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        placeholder={fieldLabel}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  );
                })}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
                >
                  {editingId ? t("common.save") : t("payment.addMethodBtn")}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      </TutorialTip>

      {/* Payment Method Cards */}
      <div className="space-y-3 mb-6">
        <AnimatePresence mode="popLayout">
          {paymentMethods.length === 0 ? (
            <EmptyState
              icon="💳"
              title={t("payment.emptyTitle")}
              description={t("payment.emptyDesc")}
            />
          ) : (
            paymentMethods.map((pm, idx) => {
              const typeInfo = getTypeInfo(pm.type);
              return (
                <motion.div
                  key={pm.id}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-xl shrink-0">
                      {typeInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                        {typeInfo.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {renderPmDetail(pm)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleEdit(pm)}
                        className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(pm.id)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="sticky bottom-4">
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold shadow-lg hover:shadow-xl transition-shadow"
        >
          {t("payment.nextBtn")}
        </button>
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title={t("payment.deleteTitle")}
        message={t("payment.deleteMsg")}
        onConfirm={() => {
          if (deleteConfirm) {
            removePaymentMethod(deleteConfirm);
            setDeleteConfirm(null);
            showToast(t("payment.toastDeleted"), "success");
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
      <ConfirmDialog
        isOpen={!!deleteContributionConfirm}
        title={t("payment.deleteContributionTitle")}
        message={t("payment.deleteContributionMsg")}
        onConfirm={() => {
          if (deleteContributionConfirm) {
            removePaymentContribution(deleteContributionConfirm);
            setDeleteContributionConfirm(null);
            showToast(t("payment.contributionToastDeleted"), "success");
          }
        }}
        onCancel={() => setDeleteContributionConfirm(null)}
      />
    </PageLayout>
  );
}
