import { describe, expect, it } from "vitest";
import { assertValidRatios, splitAmount } from "@/lib/money";

describe("money", () => {
  it("validates ratio totals", () => {
    expect(() =>
      assertValidRatios([
        { memberId: "a", basisPoints: 6000 },
        { memberId: "b", basisPoints: 4000 }
      ])
    ).not.toThrow();

    expect(() =>
      assertValidRatios([
        { memberId: "a", basisPoints: 6000 },
        { memberId: "b", basisPoints: 3000 }
      ])
    ).toThrow("100%");
  });

  it("splits yen without losing remainder", () => {
    const shares = splitAmount(10001, [
      { memberId: "a", basisPoints: 5000 },
      { memberId: "b", basisPoints: 5000 }
    ]);

    expect(shares.reduce((sum, share) => sum + share.amountYen, 0)).toBe(10001);
    expect(shares.map((share) => share.amountYen).sort()).toEqual([5000, 5001]);
  });
});
