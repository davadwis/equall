import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useStore } from "../store/useStore";
import { useToast } from "../components/Toast";
import PageLayout from "../components/PageLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import { formatCurrency } from "../lib/formatters";
import type { Person } from "../types";

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95 },
};

export default function AssignItems() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const session = useStore((s) => s.session);
  const menuPool = useStore((s) => s.menuPool);
  const persons = useStore((s) => s.persons);
  const addPerson = useStore((s) => s.addPerson);
  const removePerson = useStore((s) => s.removePerson);
  const updatePersonName = useStore((s) => s.updatePersonName);
  const claimItem = useStore((s) => s.claimItem);
  const unclaimItem = useStore((s) => s.unclaimItem);
  const updateClaimedQty = useStore((s) => s.updateClaimedQty);
  const setCurrentStep = useStore((s) => s.setCurrentStep);

  const currency = session?.currency ?? "IDR";

  const [newPersonName, setNewPersonName] = useState("");
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [claimInputs, setClaimInputs] = useState<
    Record<string, Record<string, string>>
  >({});

  const handleAddPerson = () => {
    if (!newPersonName.trim()) {
      showToast(t("assignItems.validationName"), "error");
      return;
    }
    addPerson(newPersonName.trim());
    setNewPersonName("");
    showToast(t("assignItems.toastAdded"), "success");
  };

  const getClaimInput = (personId: string, menuId: string) =>
    claimInputs[personId]?.[menuId] ?? "";

  const setClaimInput = (personId: string, menuId: string, val: string) => {
    setClaimInputs((prev) => ({
      ...prev,
      [personId]: { ...(prev[personId] ?? {}), [menuId]: val },
    }));
  };

  const handleClaimToggle = (person: Person, menuId: string) => {
    const existing = person.claimedItems.find((ci) => ci.menuId === menuId);
    const menuItem = menuPool.find((m) => m.id === menuId);
    if (!menuItem) return;

    if (existing) {
      unclaimItem(person.id, menuId);
      setClaimInput(person.id, menuId, "");
    } else {
      const available = menuItem.remainingQty;
      if (available < 1) {
        showToast(t("assignItems.validationStockOut"), "warning");
        return;
      }
      const qty = parseInt(getClaimInput(person.id, menuId)) || 1;
      const clamped = Math.min(qty, available);
      claimItem(person.id, menuId, clamped);
      setClaimInput(person.id, menuId, String(clamped));
    }
  };

  const handleQtyChange = (person: Person, menuId: string, rawVal: string) => {
    setClaimInput(person.id, menuId, rawVal);
    const menuItem = menuPool.find((m) => m.id === menuId);
    if (!menuItem) return;
    const existing = person.claimedItems.find((ci) => ci.menuId === menuId);
    if (!existing) return;

    const newQty = parseInt(rawVal);
    if (!newQty || newQty < 1) return;

    const maxAllowed = existing.qty + menuItem.remainingQty;
    const clamped = Math.min(newQty, maxAllowed);
    updateClaimedQty(person.id, menuId, clamped);
  };

  const getPersonSubtotal = (person: Person) =>
    person.claimedItems.reduce((s, ci) => s + ci.subtotal, 0);

  const handleNext = () => {
    if (persons.length === 0) {
      showToast(t("assignItems.validationMin1"), "error");
      return;
    }
    const totalClaimed = persons.reduce(
      (s, p) => s + p.claimedItems.reduce((ss, ci) => ss + ci.qty, 0),
      0,
    );
    if (totalClaimed === 0) {
      showToast(t("assignItems.validationMin1Claim"), "error");
      return;
    }
    setCurrentStep(4);
    navigate("/charges");
  };

  // Pool summary
  const totalItems = menuPool.reduce((s, m) => s + m.totalQty, 0);
  const remainingItems = menuPool.reduce((s, m) => s + m.remainingQty, 0);

  return (
    <PageLayout
      currentStep={3}
      title={t("assignItems.pageTitle")}
      subtitle={t("assignItems.pageSubtitle")}
    >
      {/* Pool Summary */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-4 text-white mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-indigo-100 text-xs font-medium">
              {t("assignItems.poolStatus")}
            </p>
            <p className="text-lg font-bold mt-0.5">
              {t("assignItems.poolRemaining", {
                remaining: remainingItems,
                total: totalItems,
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-indigo-100 text-xs">
              {t("assignItems.poolMenuCount", { count: menuPool.length })}
            </p>
            <div
              className={`mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                remainingItems === 0 ? "bg-emerald-400" : "bg-white/20"
              }`}
            >
              {remainingItems === 0
                ? t("assignItems.poolAllAssigned")
                : t("assignItems.poolStillRemaining")}
            </div>
          </div>
        </div>
        <div className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
          <motion.div
            animate={{
              width:
                totalItems > 0
                  ? `${((totalItems - remainingItems) / totalItems) * 100}%`
                  : "0%",
            }}
            className="h-full bg-white rounded-full"
          />
        </div>
      </div>

      {/* Add Person */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          {t("assignItems.addPersonTitle")}
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
            placeholder={t("assignItems.personNamePlaceholder")}
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={handleAddPerson}
            className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors"
          >
            {t("assignItems.addPersonBtn")}
          </button>
        </div>
      </div>

      {/* Persons List */}
      <div className="space-y-3 mb-6">
        <AnimatePresence mode="popLayout">
          {persons.length === 0 ? (
            <EmptyState
              icon="👥"
              title={t("assignItems.emptyTitle")}
              description={t("assignItems.emptyDesc")}
            />
          ) : (
            persons.map((person, idx) => {
              const subtotal = getPersonSubtotal(person);
              const isExpanded = expandedPerson === person.id;
              return (
                <motion.div
                  key={person.id}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
                >
                  {/* Person Header */}
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={person.name}
                        onChange={(e) =>
                          updatePersonName(person.id, e.target.value)
                        }
                        className="font-semibold text-gray-800 dark:text-gray-100 text-sm bg-transparent dark:bg-transparent focus:outline-none w-full truncate"
                      />
                      <p className="text-xs text-indigo-600 font-medium">
                        {t("assignItems.itemCountLabel", {
                          count: person.claimedItems.length,
                          subtotal: formatCurrency(subtotal, currency),
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() =>
                          setExpandedPerson(isExpanded ? null : person.id)
                        }
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                      >
                        {isExpanded
                          ? t("assignItems.closeBtn")
                          : t("assignItems.claimBtn")}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(person.id)}
                        className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-400 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950 text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Claimed Items Summary */}
                  {person.claimedItems.length > 0 && !isExpanded && (
                    <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                      {person.claimedItems.map((ci) => (
                        <span
                          key={ci.menuId}
                          className="text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-full px-2.5 py-0.5 font-medium"
                        >
                          {ci.name} ×{ci.qty}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded Claim Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-gray-100 dark:border-gray-800"
                      >
                        <div className="p-4 space-y-2">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                            {t("assignItems.claimPanelTitle")}
                          </p>
                          {menuPool.map((menuItem) => {
                            const claimed = person.claimedItems.find(
                              (ci) => ci.menuId === menuItem.id,
                            );
                            const isClaimed = !!claimed;
                            const maxQty = isClaimed
                              ? claimed.qty + menuItem.remainingQty
                              : menuItem.remainingQty;
                            const isOutOfStock =
                              !isClaimed && menuItem.remainingQty === 0;

                            return (
                              <div
                                key={menuItem.id}
                                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                                  isClaimed
                                    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
                                    : isOutOfStock
                                      ? "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 opacity-50"
                                      : "border-gray-200 dark:border-gray-700 hover:border-indigo-200 hover:bg-indigo-50 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30"
                                }`}
                              >
                                <button
                                  onClick={() =>
                                    handleClaimToggle(person, menuItem.id)
                                  }
                                  disabled={isOutOfStock}
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                                    isClaimed
                                      ? "bg-emerald-500 border-emerald-500 text-white"
                                      : isOutOfStock
                                        ? "border-gray-300 dark:border-gray-600 cursor-not-allowed"
                                        : "border-gray-300 dark:border-gray-600 hover:border-indigo-400"
                                  }`}
                                >
                                  {isClaimed && (
                                    <span className="text-xs">✓</span>
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                    {menuItem.name}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {formatCurrency(
                                      menuItem.pricePerUnit,
                                      currency,
                                    )}
                                    /pcs
                                    {isOutOfStock && !isClaimed && (
                                      <span className="text-red-400 ml-1">
                                        {t("assignItems.soldOut")}
                                      </span>
                                    )}
                                    {!isOutOfStock && !isClaimed && (
                                      <span className="text-gray-400 ml-1">
                                        {t("assignItems.remainingQty", {
                                          qty: menuItem.remainingQty,
                                        })}
                                      </span>
                                    )}
                                  </p>
                                </div>

                                {isClaimed && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => {
                                        const newQty = claimed.qty - 1;
                                        if (newQty < 1) {
                                          unclaimItem(person.id, menuItem.id);
                                        } else {
                                          updateClaimedQty(
                                            person.id,
                                            menuItem.id,
                                            newQty,
                                          );
                                          setClaimInput(
                                            person.id,
                                            menuItem.id,
                                            String(newQty),
                                          );
                                        }
                                      }}
                                      className="w-6 h-6 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-200 dark:hover:border-red-800 text-sm"
                                    >
                                      −
                                    </button>
                                    <input
                                      type="number"
                                      min={1}
                                      max={maxQty}
                                      value={
                                        getClaimInput(person.id, menuItem.id) ||
                                        claimed.qty
                                      }
                                      onChange={(e) =>
                                        handleQtyChange(
                                          person,
                                          menuItem.id,
                                          e.target.value,
                                        )
                                      }
                                      className="w-10 text-center text-sm font-bold text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-md py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                    />
                                    <button
                                      onClick={() => {
                                        if (menuItem.remainingQty > 0) {
                                          const newQty = claimed.qty + 1;
                                          updateClaimedQty(
                                            person.id,
                                            menuItem.id,
                                            newQty,
                                          );
                                          setClaimInput(
                                            person.id,
                                            menuItem.id,
                                            String(newQty),
                                          );
                                        } else {
                                          showToast(
                                            t("assignItems.validationQtyOut"),
                                            "warning",
                                          );
                                        }
                                      }}
                                      className="w-6 h-6 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:border-emerald-200 dark:hover:border-emerald-800 text-sm"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}

                                {!isClaimed && !isOutOfStock && (
                                  <input
                                    type="number"
                                    min={1}
                                    max={menuItem.remainingQty}
                                    value={getClaimInput(
                                      person.id,
                                      menuItem.id,
                                    )}
                                    onChange={(e) =>
                                      setClaimInput(
                                        person.id,
                                        menuItem.id,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="qty"
                                    className="w-14 text-center text-sm border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
          {t("assignItems.nextBtn")}
        </button>
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title={t("assignItems.deleteTitle")}
        message={t("assignItems.deleteMsg")}
        onConfirm={() => {
          if (deleteConfirm) {
            removePerson(deleteConfirm);
            setDeleteConfirm(null);
            showToast(t("assignItems.toastDeleted"), "success");
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </PageLayout>
  );
}
