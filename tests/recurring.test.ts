import { RecurrenceFrequency } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { shouldGenerateForDate } from "@/lib/recurring";

describe("recurring", () => {
  it("matches daily rules", () => {
    expect(
      shouldGenerateForDate(
        { id: "r", frequency: RecurrenceFrequency.DAILY, dayOfMonth: null, dayOfWeek: null, isActive: true },
        new Date("2026-05-28T00:00:00Z")
      )
    ).toBe(true);
  });

  it("matches weekly rules by UTC day of week", () => {
    expect(
      shouldGenerateForDate(
        { id: "r", frequency: RecurrenceFrequency.WEEKLY, dayOfMonth: null, dayOfWeek: 4, isActive: true },
        new Date("2026-05-28T00:00:00Z")
      )
    ).toBe(true);
  });

  it("uses month end when day 31 is configured for a short month", () => {
    expect(
      shouldGenerateForDate(
        { id: "r", frequency: RecurrenceFrequency.MONTHLY, dayOfMonth: 31, dayOfWeek: null, isActive: true },
        new Date("2026-02-28T00:00:00Z")
      )
    ).toBe(true);
  });
});
