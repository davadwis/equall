import type {
  Charge,
  MenuItem,
  Person,
  PersonSummary,
  SplitMode,
} from "../types";
import { round2 } from "./formatters";

export function calculatePersonSummaries(
  persons: Person[],
  charges: Charge[],
  menuPool: MenuItem[] = [],
  splitMode: SplitMode = "itemized",
): PersonSummary[] {
  const isEqualSplit = splitMode === "equal";
  const menuTotal = menuPool.reduce((sum, item) => sum + item.totalPrice, 0);
  const claimedTotal = persons.reduce(
    (sum, p) => sum + p.claimedItems.reduce((s, ci) => s + ci.subtotal, 0),
    0,
  );
  const grandItemTotal = isEqualSplit ? menuTotal : claimedTotal;
  const personIds = persons.map((person) => person.id);

  const getItemParticipantIds = (item: MenuItem) =>
    item.splitWithPersonIds === undefined
      ? personIds
      : item.splitWithPersonIds.filter((personId) =>
          personIds.includes(personId),
        );

  return persons.map((person) => {
    const claimedSubtotal = person.claimedItems.reduce(
      (s, ci) => s + ci.subtotal,
      0,
    );
    const equalItems = isEqualSplit
      ? menuPool
          .map((item) => {
            const participantIds = getItemParticipantIds(item);
            if (!participantIds.includes(person.id) || participantIds.length === 0) {
              return null;
            }
            const subtotal = round2(item.totalPrice / participantIds.length);
            return {
              menuId: item.id,
              name: item.name,
              qty: 1,
              pricePerUnit: subtotal,
              subtotal,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [];
    const equalSubtotal = equalItems.reduce((sum, item) => sum + item.subtotal, 0);
    const itemSubtotal = round2(isEqualSplit ? equalSubtotal : claimedSubtotal);
    const summaryPerson =
      isEqualSplit && grandItemTotal > 0
        ? {
            ...person,
            claimedItems: equalItems,
          }
        : person;

    const chargeBreakdown: PersonSummary["chargeBreakdown"] = charges.map(
      (charge) => {
        const base =
          charge.applyTo === "items" ? itemSubtotal : grandItemTotal;

        const chargeTotal =
          charge.method === "percentage"
            ? base * (charge.value / 100)
            : charge.value;

        let personShare: number;
        if (charge.distribution === "equal") {
          personShare = persons.length > 0 ? chargeTotal / persons.length : 0;
        } else {
          // proportional
          if (grandItemTotal > 0) {
            personShare = chargeTotal * (itemSubtotal / grandItemTotal);
          } else {
            personShare = persons.length > 0 ? chargeTotal / persons.length : 0;
          }
        }

        return {
          chargeId: charge.id,
          chargeName: charge.name || charge.type,
          amount: round2(personShare),
        };
      },
    );

    const total = round2(
      itemSubtotal + chargeBreakdown.reduce((s, c) => s + c.amount, 0),
    );

    return { person: summaryPerson, itemSubtotal, chargeBreakdown, total };
  });
}
