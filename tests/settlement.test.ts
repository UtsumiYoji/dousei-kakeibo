import { describe, expect, it } from "vitest";
import { calculateSettlement } from "@/lib/settlement";

describe("settlement", () => {
  it("calculates balances and suggested transfers", () => {
    const summary = calculateSettlement(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" }
      ],
      [
        {
          id: "e1",
          amountYen: 10000,
          payerMemberId: "a",
          splits: [
            { memberId: "a", basisPoints: 6000 },
            { memberId: "b", basisPoints: 4000 }
          ]
        }
      ],
      []
    );

    expect(summary.balances.find((balance) => balance.memberId === "a")?.balanceYen).toBe(4000);
    expect(summary.balances.find((balance) => balance.memberId === "b")?.balanceYen).toBe(-4000);
    expect(summary.suggestedTransfers).toEqual([
      { fromMemberId: "b", fromName: "B", toMemberId: "a", toName: "A", amountYen: 4000 }
    ]);
  });

  it("accounts for registered transfers", () => {
    const summary = calculateSettlement(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" }
      ],
      [
        {
          id: "e1",
          amountYen: 10000,
          payerMemberId: "a",
          splits: [
            { memberId: "a", basisPoints: 5000 },
            { memberId: "b", basisPoints: 5000 }
          ]
        }
      ],
      [{ id: "t1", fromMemberId: "b", toMemberId: "a", amountYen: 2000 }]
    );

    expect(summary.suggestedTransfers[0].amountYen).toBe(3000);
  });
});
