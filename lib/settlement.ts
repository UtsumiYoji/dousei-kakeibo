import { splitAmount, type RatioInput } from "@/lib/money";

export type SettlementMember = {
  id: string;
  name: string;
};

export type SettlementExpense = {
  id: string;
  amountYen: number;
  payerMemberId: string;
  splits: RatioInput[];
};

export type SettlementTransfer = {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amountYen: number;
};

export type MemberBalance = {
  memberId: string;
  name: string;
  paidYen: number;
  owedYen: number;
  transferOutYen: number;
  transferInYen: number;
  balanceYen: number;
};

export type SuggestedTransfer = {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amountYen: number;
};

export type SettlementSummary = {
  balances: MemberBalance[];
  suggestedTransfers: SuggestedTransfer[];
};

export function calculateSettlement(
  members: SettlementMember[],
  expenses: SettlementExpense[],
  transfers: SettlementTransfer[]
): SettlementSummary {
  const byMember = new Map<string, MemberBalance>();

  for (const member of members) {
    byMember.set(member.id, {
      memberId: member.id,
      name: member.name,
      paidYen: 0,
      owedYen: 0,
      transferOutYen: 0,
      transferInYen: 0,
      balanceYen: 0
    });
  }

  for (const expense of expenses) {
    const payer = byMember.get(expense.payerMemberId);
    if (payer) payer.paidYen += expense.amountYen;

    for (const share of splitAmount(expense.amountYen, expense.splits)) {
      const member = byMember.get(share.memberId);
      if (member) member.owedYen += share.amountYen;
    }
  }

  for (const transfer of transfers) {
    const from = byMember.get(transfer.fromMemberId);
    const to = byMember.get(transfer.toMemberId);
    if (from) from.transferOutYen += transfer.amountYen;
    if (to) to.transferInYen += transfer.amountYen;
  }

  const balances = [...byMember.values()].map((member) => ({
    ...member,
    balanceYen: member.paidYen - member.owedYen - member.transferInYen + member.transferOutYen
  }));

  return {
    balances,
    suggestedTransfers: suggestTransfers(balances)
  };
}

function suggestTransfers(balances: MemberBalance[]): SuggestedTransfer[] {
  const debtors = balances
    .filter((balance) => balance.balanceYen < 0)
    .map((balance) => ({ ...balance, remaining: -balance.balanceYen }))
    .sort((a, b) => b.remaining - a.remaining);
  const creditors = balances
    .filter((balance) => balance.balanceYen > 0)
    .map((balance) => ({ ...balance, remaining: balance.balanceYen }))
    .sort((a, b) => b.remaining - a.remaining);

  const suggestions: SuggestedTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountYen = Math.min(debtor.remaining, creditor.remaining);

    if (amountYen > 0) {
      suggestions.push({
        fromMemberId: debtor.memberId,
        fromName: debtor.name,
        toMemberId: creditor.memberId,
        toName: creditor.name,
        amountYen
      });
    }

    debtor.remaining -= amountYen;
    creditor.remaining -= amountYen;
    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return suggestions;
}
