import { Prisma, RecurrenceFrequency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertValidAmount, assertValidRatios, equalRatios, type RatioInput } from "@/lib/money";
import { calculateSettlement } from "@/lib/settlement";
import { assertValidRecurringRule, normalizeDateOnly, shouldGenerateForDate } from "@/lib/recurring";

const memberSelect = {
  id: true,
  name: true,
  displayOrder: true,
  isActive: true
} satisfies Prisma.MemberSelect;

export type RatioPayload = RatioInput;

export async function listMembers() {
  return prisma.member.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: memberSelect
  });
}

export async function createMember(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("名前を入力してください。");

  const count = await prisma.member.count();
  const member = await prisma.member.create({
    data: { name: trimmedName, displayOrder: count },
    select: memberSelect
  });

  await ensureDefaultRatiosForAllCategories();
  return member;
}

export async function updateMember(id: string, input: { name?: string; isActive?: boolean }) {
  if (input.name != null && !input.name.trim()) throw new Error("名前を入力してください。");
  return prisma.member.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      isActive: input.isActive
    },
    select: memberSelect
  });
}

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    include: {
      ratios: {
        include: { member: { select: memberSelect } },
        orderBy: { member: { displayOrder: "asc" } }
      }
    }
  });
}

export async function createCategory(input: { name: string; ratios?: RatioPayload[] }) {
  const name = input.name.trim();
  if (!name) throw new Error("カテゴリ名を入力してください。");
  const ratios = input.ratios?.length ? input.ratios : await defaultRatios();
  assertValidRatios(ratios);
  const displayOrder = await prisma.category.count();

  return prisma.category.create({
    data: {
      name,
      displayOrder,
      ratios: {
        create: ratios.map((ratio) => ({
          memberId: ratio.memberId,
          basisPoints: ratio.basisPoints
        }))
      }
    },
    include: { ratios: true }
  });
}

export async function updateCategory(id: string, input: { name?: string; ratios?: RatioPayload[]; displayOrder?: number }) {
  if (input.name != null && !input.name.trim()) throw new Error("カテゴリ名を入力してください。");
  if (input.ratios) assertValidRatios(input.ratios);
  if (input.displayOrder != null && !Number.isInteger(input.displayOrder)) throw new Error("表示順が不正です。");

  return prisma.$transaction(async (tx) => {
    if (input.ratios) {
      await tx.categoryRatio.deleteMany({ where: { categoryId: id } });
      await tx.categoryRatio.createMany({
        data: input.ratios.map((ratio) => ({
          categoryId: id,
          memberId: ratio.memberId,
          basisPoints: ratio.basisPoints
        }))
      });
    }

    return tx.category.update({
      where: { id },
      data: { name: input.name?.trim(), displayOrder: input.displayOrder },
      include: { ratios: true }
    });
  });
}

export async function reorderCategories(orderedIds: string[]) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error("カテゴリの並び順を指定してください。");
  }

  await prisma.$transaction(
    orderedIds.map((id, displayOrder) =>
      prisma.category.update({
        where: { id },
        data: { displayOrder }
      })
    )
  );

  return listCategories();
}

export async function listExpenses(options?: { settled?: "all" | "settled" | "unsettled" }) {
  const settled = options?.settled ?? "unsettled";
  return prisma.expense.findMany({
    where: settled === "all" ? {} : settled === "settled" ? { settledAt: { not: null } } : { settledAt: null },
    orderBy: { occurredAt: "desc" },
    include: {
      payer: { select: memberSelect },
      category: true,
      splits: {
        include: { member: { select: memberSelect } },
        orderBy: { member: { displayOrder: "asc" } }
      }
    }
  });
}

export async function createExpense(input: {
  description: string;
  amountYen: number;
  payerMemberId: string;
  categoryId: string;
  occurredAt?: Date;
  ratios?: RatioPayload[];
  recurringRuleId?: string;
}) {
  const description = input.description.trim();
  if (!description) throw new Error("支出内容を入力してください。");
  assertValidAmount(input.amountYen);

  const ratios = input.ratios?.length ? input.ratios : await categoryRatios(input.categoryId);
  assertValidRatios(ratios);

  return prisma.expense.create({
    data: {
      description,
      amountYen: input.amountYen,
      payerMemberId: input.payerMemberId,
      categoryId: input.categoryId,
      occurredAt: input.occurredAt ?? new Date(),
      recurringRuleId: input.recurringRuleId,
      splits: {
        create: ratios.map((ratio) => ({
          memberId: ratio.memberId,
          basisPoints: ratio.basisPoints
        }))
      }
    },
    include: { payer: true, category: true, splits: true }
  });
}

export async function updateExpense(id: string, input: {
  description?: string;
  amountYen?: number;
  payerMemberId?: string;
  categoryId?: string;
  occurredAt?: Date;
  ratios?: RatioPayload[];
}) {
  if (input.description != null && !input.description.trim()) throw new Error("支出内容を入力してください。");
  if (input.amountYen != null) assertValidAmount(input.amountYen);
  if (input.ratios) assertValidRatios(input.ratios);

  return prisma.$transaction(async (tx) => {
    if (input.ratios) {
      await tx.expenseSplit.deleteMany({ where: { expenseId: id } });
      await tx.expenseSplit.createMany({
        data: input.ratios.map((ratio) => ({
          expenseId: id,
          memberId: ratio.memberId,
          basisPoints: ratio.basisPoints
        }))
      });
    }

    return tx.expense.update({
      where: { id },
      data: {
        description: input.description?.trim(),
        amountYen: input.amountYen,
        payerMemberId: input.payerMemberId,
        categoryId: input.categoryId,
        occurredAt: input.occurredAt
      },
      include: { payer: true, category: true, splits: true }
    });
  });
}

export async function deleteExpense(id: string) {
  await prisma.expense.delete({ where: { id } });
  return { ok: true };
}

export async function settleExpenses(ids: string[]) {
  if (!Array.isArray(ids) || ids.length === 0) throw new Error("清算計上する支出を選択してください。");
  return prisma.expense.updateMany({
    where: { id: { in: ids }, settledAt: null },
    data: { settledAt: new Date() }
  });
}

export async function listTransfers() {
  return prisma.transfer.findMany({
    orderBy: { transferredAt: "desc" },
    include: {
      fromMember: { select: memberSelect },
      toMember: { select: memberSelect }
    }
  });
}

export async function createTransfer(input: {
  fromMemberId: string;
  toMemberId: string;
  amountYen: number;
  note?: string;
  transferredAt?: Date;
}) {
  if (input.fromMemberId === input.toMemberId) throw new Error("受け渡し者と受け取り者は別のメンバーを選んでください。");
  assertValidAmount(input.amountYen);
  return prisma.transfer.create({
    data: {
      fromMemberId: input.fromMemberId,
      toMemberId: input.toMemberId,
      amountYen: input.amountYen,
      note: input.note?.trim() || null,
      transferredAt: input.transferredAt ?? new Date()
    },
    include: { fromMember: true, toMember: true }
  });
}

export async function getSettlementSummary() {
  const [members, expenses, transfers] = await Promise.all([
    prisma.member.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.expense.findMany({ where: { settledAt: { not: null } }, include: { splits: true } }),
    prisma.transfer.findMany()
  ]);

  return calculateSettlement(
    members.map((member) => ({ id: member.id, name: member.name })),
    expenses.map((expense) => ({
      id: expense.id,
      amountYen: expense.amountYen,
      payerMemberId: expense.payerMemberId,
      splits: expense.splits.map((split) => ({ memberId: split.memberId, basisPoints: split.basisPoints }))
    })),
    transfers.map((transfer) => ({
      id: transfer.id,
      fromMemberId: transfer.fromMemberId,
      toMemberId: transfer.toMemberId,
      amountYen: transfer.amountYen
    }))
  );
}

export async function listRecurringRules() {
  return prisma.recurringExpenseRule.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      payer: { select: memberSelect },
      category: true,
      splits: {
        include: { member: { select: memberSelect } },
        orderBy: { member: { displayOrder: "asc" } }
      }
    }
  });
}

export async function createRecurringRule(input: {
  frequency: RecurrenceFrequency;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  description: string;
  amountYen: number;
  payerMemberId: string;
  categoryId: string;
  ratios?: RatioPayload[];
}) {
  const description = input.description.trim();
  if (!description) throw new Error("支出内容を入力してください。");
  assertValidAmount(input.amountYen);
  assertValidRecurringRule(input);
  const ratios = input.ratios?.length ? input.ratios : await categoryRatios(input.categoryId);
  assertValidRatios(ratios);

  return prisma.recurringExpenseRule.create({
    data: {
      frequency: input.frequency,
      dayOfMonth: input.frequency === RecurrenceFrequency.MONTHLY ? input.dayOfMonth : null,
      dayOfWeek: input.frequency === RecurrenceFrequency.WEEKLY ? input.dayOfWeek : null,
      description,
      amountYen: input.amountYen,
      payerMemberId: input.payerMemberId,
      categoryId: input.categoryId,
      splits: {
        create: ratios.map((ratio) => ({
          memberId: ratio.memberId,
          basisPoints: ratio.basisPoints
        }))
      }
    },
    include: { splits: true }
  });
}

export async function updateRecurringRule(id: string, input: Partial<{
  frequency: RecurrenceFrequency;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  description: string;
  amountYen: number;
  payerMemberId: string;
  categoryId: string;
  isActive: boolean;
  ratios: RatioPayload[];
}>) {
  if (input.description != null && !input.description.trim()) throw new Error("支出内容を入力してください。");
  if (input.amountYen != null) assertValidAmount(input.amountYen);
  if (input.ratios) assertValidRatios(input.ratios);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.recurringExpenseRule.findUniqueOrThrow({ where: { id } });
    const frequency = input.frequency ?? existing.frequency;
    assertValidRecurringRule({
      frequency,
      dayOfMonth: input.dayOfMonth ?? existing.dayOfMonth,
      dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek
    });

    if (input.ratios) {
      await tx.recurringExpenseSplit.deleteMany({ where: { ruleId: id } });
      await tx.recurringExpenseSplit.createMany({
        data: input.ratios.map((ratio) => ({
          ruleId: id,
          memberId: ratio.memberId,
          basisPoints: ratio.basisPoints
        }))
      });
    }

    return tx.recurringExpenseRule.update({
      where: { id },
      data: {
        frequency: input.frequency,
        dayOfMonth: frequency === RecurrenceFrequency.MONTHLY ? input.dayOfMonth ?? existing.dayOfMonth : null,
        dayOfWeek: frequency === RecurrenceFrequency.WEEKLY ? input.dayOfWeek ?? existing.dayOfWeek : null,
        description: input.description?.trim(),
        amountYen: input.amountYen,
        payerMemberId: input.payerMemberId,
        categoryId: input.categoryId,
        isActive: input.isActive
      },
      include: { splits: true }
    });
  });
}

export async function runRecurringGeneration(target = new Date()) {
  const targetDate = normalizeDateOnly(target);
  const rules = await prisma.recurringExpenseRule.findMany({
    where: { isActive: true },
    include: { splits: true }
  });

  const generated = [];
  for (const rule of rules) {
    if (!shouldGenerateForDate(rule, targetDate)) continue;

    const result = await prisma.$transaction(async (tx) => {
      const exists = await tx.recurringExpenseGeneration.findUnique({
        where: { ruleId_targetDate: { ruleId: rule.id, targetDate } }
      });
      if (exists) return null;

      const expense = await tx.expense.create({
        data: {
          description: rule.description,
          amountYen: rule.amountYen,
          payerMemberId: rule.payerMemberId,
          categoryId: rule.categoryId,
          occurredAt: targetDate,
          recurringRuleId: rule.id,
          splits: {
            create: rule.splits.map((split) => ({
              memberId: split.memberId,
              basisPoints: split.basisPoints
            }))
          }
        }
      });
      await tx.recurringExpenseGeneration.create({
        data: { ruleId: rule.id, targetDate, expenseId: expense.id }
      });
      await tx.recurringExpenseRule.update({
        where: { id: rule.id },
        data: { lastGeneratedAt: new Date() }
      });
      return expense;
    });

    if (result) generated.push(result);
  }

  return { generatedCount: generated.length, generated };
}

async function defaultRatios(): Promise<RatioPayload[]> {
  const members = await prisma.member.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }]
  });
  return equalRatios(members.map((member) => member.id));
}

async function categoryRatios(categoryId: string): Promise<RatioPayload[]> {
  const ratios = await prisma.categoryRatio.findMany({ where: { categoryId } });
  if (ratios.length === 0) return defaultRatios();
  return ratios.map((ratio) => ({ memberId: ratio.memberId, basisPoints: ratio.basisPoints }));
}

async function ensureDefaultRatiosForAllCategories() {
  const categories = await prisma.category.findMany();
  const ratios = await defaultRatios();
  if (ratios.length === 0) return;

  await prisma.$transaction(
    categories.map((category) =>
      prisma.categoryRatio.deleteMany({ where: { categoryId: category.id } })
    )
  );
  await prisma.categoryRatio.createMany({
    data: categories.flatMap((category) =>
      ratios.map((ratio) => ({
        categoryId: category.id,
        memberId: ratio.memberId,
        basisPoints: ratio.basisPoints
      }))
    )
  });
}
