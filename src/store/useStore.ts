import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type {
  Session,
  MenuItem,
  Person,
  ClaimedItem,
  Charge,
  PaymentMethod,
  PaymentContribution,
  Currency,
  SplitMode,
} from "../types";
import { generateSlug } from "../lib/formatters";

interface StoreState {
  currentStep: number;
  session: Session | null;
  menuPool: MenuItem[];
  persons: Person[];
  charges: Charge[];
  paymentMethods: PaymentMethod[];
  paymentContributions: PaymentContribution[];

  // Session
  createSession: (
    name: string,
    currency: Currency,
    splitMode?: SplitMode,
  ) => Session;
  setCurrentStep: (step: number) => void;

  // Menu Pool
  addMenuItem: (name: string, totalQty: number, pricePerUnit: number) => void;
  updateMenuItem: (
    id: string,
    updates: Partial<Omit<MenuItem, "id" | "remainingQty">>,
  ) => void;
  removeMenuItem: (id: string) => void;
  updateMenuItemSplitPeople: (id: string, personIds?: string[]) => void;

  // Persons
  setPersons: (persons: Person[]) => void;
  addPerson: (name: string) => void;
  removePerson: (id: string) => void;
  updatePersonName: (id: string, name: string) => void;
  claimItem: (personId: string, menuId: string, qty: number) => void;
  unclaimItem: (personId: string, menuId: string) => void;
  updateClaimedQty: (personId: string, menuId: string, qty: number) => void;

  // Charges
  addCharge: (charge: Omit<Charge, "id">) => void;
  updateCharge: (id: string, updates: Partial<Omit<Charge, "id">>) => void;
  removeCharge: (id: string) => void;

  // Payment Methods
  addPaymentMethod: (pm: Omit<PaymentMethod, "id">) => void;
  updatePaymentMethod: (
    id: string,
    updates: Partial<Omit<PaymentMethod, "id">>,
  ) => void;
  removePaymentMethod: (id: string) => void;

  // Payment Contributions
  addPaymentContribution: (
    contribution: Omit<PaymentContribution, "id">,
  ) => void;
  updatePaymentContribution: (
    id: string,
    updates: Partial<Omit<PaymentContribution, "id">>,
  ) => void;
  removePaymentContribution: (id: string) => void;

  // Reset
  resetStore: () => void;
  loadState: (state: {
    session: Session;
    menuPool: MenuItem[];
    persons: Person[];
    charges: Charge[];
    paymentMethods: PaymentMethod[];
    paymentContributions?: PaymentContribution[];
  }) => void;
}

function computeRemainingQty(item: MenuItem, persons: Person[]): number {
  const claimed = persons.reduce((sum, p) => {
    const ci = p.claimedItems.find((c) => c.menuId === item.id);
    return sum + (ci ? ci.qty : 0);
  }, 0);
  return item.totalQty - claimed;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      currentStep: 1,
      session: null,
      menuPool: [],
      persons: [],
      charges: [],
      paymentMethods: [],
      paymentContributions: [],

      createSession: (name, currency, splitMode = "itemized") => {
        const slug = generateSlug(name);
        const session: Session = { id: slug, name, currency, slug, splitMode };
        set({
          session,
          currentStep: 2,
          menuPool: [],
          persons: [],
          charges: [],
          paymentMethods: [],
          paymentContributions: [],
        });
        return session;
      },

      setCurrentStep: (step) => set({ currentStep: step }),

      addMenuItem: (name, totalQty, pricePerUnit) => {
        const newItem: MenuItem = {
          id: uuidv4(),
          name,
          totalQty,
          pricePerUnit,
          totalPrice: pricePerUnit * totalQty,
          remainingQty: totalQty,
        };
        set((state) => ({ menuPool: [...state.menuPool, newItem] }));
      },

      updateMenuItem: (id, updates) => {
        set((state) => {
          const updatedPool = state.menuPool.map((item) => {
            if (item.id !== id) return item;
            const merged = { ...item, ...updates };
            if (updates.pricePerUnit !== undefined) {
              merged.totalPrice = merged.pricePerUnit * merged.totalQty;
            }
            if (updates.totalQty !== undefined) {
              merged.totalPrice = merged.pricePerUnit * merged.totalQty;
            }
            merged.remainingQty = computeRemainingQty(merged, state.persons);
            return merged;
          });
          return { menuPool: updatedPool };
        });
      },

      removeMenuItem: (id) => {
        set((state) => ({
          menuPool: state.menuPool.filter((item) => item.id !== id),
          persons: state.persons.map((p) => ({
            ...p,
            claimedItems: p.claimedItems.filter((ci) => ci.menuId !== id),
          })),
        }));
      },

      updateMenuItemSplitPeople: (id, personIds) => {
        set((state) => ({
          menuPool: state.menuPool.map((item) =>
            item.id === id ? { ...item, splitWithPersonIds: personIds } : item,
          ),
        }));
      },

      setPersons: (persons) => set({ persons }),

      addPerson: (name) => {
        const newPerson: Person = { id: uuidv4(), name, claimedItems: [] };
        set((state) => ({ persons: [...state.persons, newPerson] }));
      },

      removePerson: (id) => {
        set((state) => {
          const newPersons = state.persons.filter((p) => p.id !== id);
          const updatedPool = state.menuPool.map((item) => ({
            ...item,
            remainingQty: computeRemainingQty(item, newPersons),
            splitWithPersonIds: item.splitWithPersonIds?.filter(
              (personId) => personId !== id,
            ),
          }));
          return {
            persons: newPersons,
            menuPool: updatedPool,
            paymentContributions: state.paymentContributions.filter(
              (contribution) => contribution.personId !== id,
            ),
          };
        });
      },

      updatePersonName: (id, name) => {
        set((state) => ({
          persons: state.persons.map((p) => (p.id === id ? { ...p, name } : p)),
        }));
      },

      claimItem: (personId, menuId, qty) => {
        set((state) => {
          const menuItem = state.menuPool.find((m) => m.id === menuId);
          if (!menuItem) return state;

          const updatedPersons = state.persons.map((p) => {
            if (p.id !== personId) return p;
            const existing = p.claimedItems.find((ci) => ci.menuId === menuId);
            if (existing) return p;
            const newClaimed: ClaimedItem = {
              menuId,
              name: menuItem.name,
              qty,
              pricePerUnit: menuItem.pricePerUnit,
              subtotal: qty * menuItem.pricePerUnit,
            };
            return { ...p, claimedItems: [...p.claimedItems, newClaimed] };
          });

          const updatedPool = state.menuPool.map((item) => ({
            ...item,
            remainingQty: computeRemainingQty(item, updatedPersons),
          }));

          return { persons: updatedPersons, menuPool: updatedPool };
        });
      },

      unclaimItem: (personId, menuId) => {
        set((state) => {
          const updatedPersons = state.persons.map((p) => {
            if (p.id !== personId) return p;
            return {
              ...p,
              claimedItems: p.claimedItems.filter((ci) => ci.menuId !== menuId),
            };
          });
          const updatedPool = state.menuPool.map((item) => ({
            ...item,
            remainingQty: computeRemainingQty(item, updatedPersons),
          }));
          return { persons: updatedPersons, menuPool: updatedPool };
        });
      },

      updateClaimedQty: (personId, menuId, qty) => {
        set((state) => {
          const menuItem = state.menuPool.find((m) => m.id === menuId);
          if (!menuItem) return state;

          const updatedPersons = state.persons.map((p) => {
            if (p.id !== personId) return p;
            return {
              ...p,
              claimedItems: p.claimedItems.map((ci) => {
                if (ci.menuId !== menuId) return ci;
                return { ...ci, qty, subtotal: qty * ci.pricePerUnit };
              }),
            };
          });

          const updatedPool = state.menuPool.map((item) => ({
            ...item,
            remainingQty: computeRemainingQty(item, updatedPersons),
          }));

          return { persons: updatedPersons, menuPool: updatedPool };
        });
      },

      addCharge: (charge) => {
        set((state) => ({
          charges: [...state.charges, { ...charge, id: uuidv4() }],
        }));
      },

      updateCharge: (id, updates) => {
        set((state) => ({
          charges: state.charges.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        }));
      },

      removeCharge: (id) => {
        set((state) => ({ charges: state.charges.filter((c) => c.id !== id) }));
      },

      addPaymentMethod: (pm) => {
        set((state) => ({
          paymentMethods: [...state.paymentMethods, { ...pm, id: uuidv4() }],
        }));
      },

      updatePaymentMethod: (id, updates) => {
        set((state) => ({
          paymentMethods: state.paymentMethods.map((pm) =>
            pm.id === id ? { ...pm, ...updates } : pm,
          ),
        }));
      },

      removePaymentMethod: (id) => {
        set((state) => ({
          paymentMethods: state.paymentMethods.filter((pm) => pm.id !== id),
        }));
      },

      addPaymentContribution: (contribution) => {
        set((state) => ({
          paymentContributions: [
            ...state.paymentContributions,
            { ...contribution, id: uuidv4() },
          ],
        }));
      },

      updatePaymentContribution: (id, updates) => {
        set((state) => ({
          paymentContributions: state.paymentContributions.map(
            (contribution) =>
              contribution.id === id
                ? { ...contribution, ...updates }
                : contribution,
          ),
        }));
      },

      removePaymentContribution: (id) => {
        set((state) => ({
          paymentContributions: state.paymentContributions.filter(
            (contribution) => contribution.id !== id,
          ),
        }));
      },

      resetStore: () =>
        set({
          currentStep: 1,
          session: null,
          menuPool: [],
          persons: [],
          charges: [],
          paymentMethods: [],
          paymentContributions: [],
        }),

      loadState: (state) =>
        set({
          session: state.session,
          menuPool: state.menuPool,
          persons: state.persons,
          charges: state.charges,
          paymentMethods: state.paymentMethods,
          paymentContributions: state.paymentContributions ?? [],
        }),
    }),
    {
      name: "equall_store",
      partialize: (state) => ({
        currentStep: state.currentStep,
        session: state.session,
        menuPool: state.menuPool,
        persons: state.persons,
        charges: state.charges,
        paymentMethods: state.paymentMethods,
        paymentContributions: state.paymentContributions,
      }),
    },
  ),
);
