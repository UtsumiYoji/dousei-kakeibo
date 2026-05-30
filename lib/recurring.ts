import { RecurrenceFrequency } from "@prisma/client";

export type RecurringRuleShape = {
  id: string;
  frequency: RecurrenceFrequency;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  isActive: boolean;
};

export function normalizeDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function shouldGenerateForDate(rule: RecurringRuleShape, targetDate: Date): boolean {
  if (!rule.isActive) return false;
  const date = normalizeDateOnly(targetDate);

  if (rule.frequency === RecurrenceFrequency.DAILY) return true;

  if (rule.frequency === RecurrenceFrequency.WEEKLY) {
    if (rule.dayOfWeek == null) return false;
    return date.getUTCDay() === rule.dayOfWeek;
  }

  if (rule.frequency === RecurrenceFrequency.MONTHLY) {
    if (rule.dayOfMonth == null) return false;
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    return date.getUTCDate() === Math.min(rule.dayOfMonth, lastDay);
  }

  return false;
}

export function assertValidRecurringRule(input: {
  frequency: RecurrenceFrequency;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
}): void {
  if (input.frequency === RecurrenceFrequency.MONTHLY) {
    if (!Number.isInteger(input.dayOfMonth) || input.dayOfMonth == null || input.dayOfMonth < 1 || input.dayOfMonth > 31) {
      throw new Error("毎月の自動支出は1から31の日付を指定してください。");
    }
  }

  if (input.frequency === RecurrenceFrequency.WEEKLY) {
    if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek == null || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
      throw new Error("毎週の自動支出は曜日を指定してください。");
    }
  }
}
