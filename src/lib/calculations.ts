import type {
  Charge,
  MenuItem,
  Person,
  PersonSummary,
  PaymentContribution,
  SplitMode,
} from "../types";
import { round2 } from "./formatters";

function distributeAmount(amount: number, weights: number[]): number[] {
  if (weights.length === 0) return [];

  const roundedAmount = round2(amount);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const rawShares =
    totalWeight > 0
      ? weights.map((weight) => roundedAmount * (weight / totalWeight))
      : weights.map(() => roundedAmount / weights.length);
  const shares = rawShares.map(round2);
  const diff = round2(
    roundedAmount - shares.reduce((sum, share) => sum + share, 0),
  );

  if (diff !== 0) {
    const targetIndex = rawShares.reduce(
      (largestIndex, share, index) =>
        share > rawShares[largestIndex] ? index : largestIndex,
      0,
    );
    shares[targetIndex] = round2(shares[targetIndex] + diff);
  }

  return shares;
}

function applyPaymentContributions(
  summaries: PersonSummary[],
  paymentContributions: PaymentContribution[],
): PersonSummary[] {
  const grandTotal = round2(
    summaries.reduce((sum, summary) => sum + summary.total, 0),
  );
  const personIds = new Set(summaries.map((summary) => summary.person.id));
  const contributionByPersonId = new Map<string, number>();

  paymentContributions.forEach((contribution) => {
    if (!personIds.has(contribution.personId) || contribution.amount <= 0) {
      return;
    }

    contributionByPersonId.set(
      contribution.personId,
      round2(
        (contributionByPersonId.get(contribution.personId) ?? 0) +
          contribution.amount,
      ),
    );
  });

  if (grandTotal <= 0 || contributionByPersonId.size === 0) {
    return summaries;
  }

  const contributionEntries = Array.from(contributionByPersonId.entries());
  const requestedContributionTotal = round2(
    contributionEntries.reduce((sum, [, amount]) => sum + amount, 0),
  );
  const contributionAmounts =
    requestedContributionTotal > grandTotal
      ? distributeAmount(
          grandTotal,
          contributionEntries.map(([, amount]) => amount),
        )
      : contributionEntries.map(([, amount]) => round2(amount));
  const fixedContributionByPersonId = new Map<string, number>();

  contributionEntries.forEach(([personId], index) => {
    fixedContributionByPersonId.set(personId, contributionAmounts[index]);
  });

  const fixedContributionTotal = round2(
    Array.from(fixedContributionByPersonId.values()).reduce(
      (sum, amount) => sum + amount,
      0,
    ),
  );
  const remainingTotal = round2(grandTotal - fixedContributionTotal);
  const finalTotalByPersonId = new Map<string, number>(
    Array.from(fixedContributionByPersonId.entries()),
  );
  const nonContributors = summaries.filter(
    (summary) => !fixedContributionByPersonId.has(summary.person.id),
  );
  const remainingPayers =
    nonContributors.length > 0 ? nonContributors : summaries;
  const remainingShares = distributeAmount(
    remainingTotal,
    remainingPayers.map((summary) => summary.total),
  );

  remainingPayers.forEach((summary, index) => {
    finalTotalByPersonId.set(
      summary.person.id,
      round2(
        (finalTotalByPersonId.get(summary.person.id) ?? 0) +
          remainingShares[index],
      ),
    );
  });

  return summaries.map((summary) => {
    const contributionAmount =
      fixedContributionByPersonId.get(summary.person.id) ?? 0;
    const total = round2(
      finalTotalByPersonId.get(summary.person.id) ?? summary.total,
    );
    const coveredAmount = round2(Math.max(0, summary.total - total));

    return {
      ...summary,
      originalTotal: summary.total,
      contributionAmount,
      coveredAmount,
      total,
    };
  });
}

export function calculatePersonSummaries(
  persons: Person[],
  charges: Charge[],
  menuPool: MenuItem[] = [],
  splitMode: SplitMode = "itemized",
  paymentContributions: PaymentContribution[] = [],
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

  const summaries = persons.map((person) => {
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

  return applyPaymentContributions(summaries, paymentContributions);
}
