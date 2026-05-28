import type { Charge, Person, PersonSummary } from "../types";
import { round2 } from "./formatters";

export function calculatePersonSummaries(
  persons: Person[],
  charges: Charge[],
): PersonSummary[] {
  const grandItemTotal = persons.reduce((sum, p) => {
    return sum + p.claimedItems.reduce((s, ci) => s + ci.subtotal, 0);
  }, 0);

  return persons.map((person) => {
    const itemSubtotal = round2(
      person.claimedItems.reduce((s, ci) => s + ci.subtotal, 0),
    );

    const chargeBreakdown: PersonSummary["chargeBreakdown"] = charges.map(
      (charge) => {
        let base = 0;
        if (charge.applyTo === "items") {
          base = itemSubtotal;
        } else {
          base = grandItemTotal;
        }

        let chargeTotal = 0;
        if (charge.method === "percentage") {
          chargeTotal = base * (charge.value / 100);
        } else {
          chargeTotal = charge.value;
        }

        let personShare = 0;
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

    return { person, itemSubtotal, chargeBreakdown, total };
  });
}
