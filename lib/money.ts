export const BASIS_POINTS_TOTAL = 10000;

export type RatioInput = {
  memberId: string;
  basisPoints: number;
};

export type YenShare = {
  memberId: string;
  basisPoints: number;
  amountYen: number;
};

export function formatYen(amountYen: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(amountYen);
}

export function parseYen(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string") return NaN;
  const normalized = value.replace(/[￥,\s]/g, "");
  return Number.parseInt(normalized, 10);
}

export function assertValidAmount(amountYen: number): void {
  if (!Number.isInteger(amountYen) || amountYen <= 0) {
    throw new Error("金額は1円以上の整数で入力してください。");
  }
}

export function assertValidRatios(ratios: RatioInput[]): void {
  if (ratios.length === 0) {
    throw new Error("割り勘率を1件以上入力してください。");
  }

  const seen = new Set<string>();
  const total = ratios.reduce((sum, ratio) => {
    if (!ratio.memberId) throw new Error("メンバーを選択してください。");
    if (seen.has(ratio.memberId)) throw new Error("同じメンバーの割り勘率が重複しています。");
    seen.add(ratio.memberId);
    if (!Number.isInteger(ratio.basisPoints) || ratio.basisPoints < 0) {
      throw new Error("割り勘率は0%以上の整数basis pointで入力してください。");
    }
    return sum + ratio.basisPoints;
  }, 0);

  if (total !== BASIS_POINTS_TOTAL) {
    throw new Error("割り勘率の合計は100%にしてください。");
  }
}

export function splitAmount(amountYen: number, ratios: RatioInput[]): YenShare[] {
  assertValidAmount(amountYen);
  assertValidRatios(ratios);

  const rawShares = ratios.map((ratio) => {
    const raw = (amountYen * ratio.basisPoints) / BASIS_POINTS_TOTAL;
    return {
      ...ratio,
      floor: Math.floor(raw),
      remainder: raw - Math.floor(raw)
    };
  });

  let remaining = amountYen - rawShares.reduce((sum, share) => sum + share.floor, 0);
  const sortedByRemainder = [...rawShares].sort((a, b) => b.remainder - a.remainder);
  const extraByMember = new Map<string, number>();

  for (const share of sortedByRemainder) {
    if (remaining <= 0) break;
    extraByMember.set(share.memberId, (extraByMember.get(share.memberId) ?? 0) + 1);
    remaining -= 1;
  }

  return rawShares.map((share) => ({
    memberId: share.memberId,
    basisPoints: share.basisPoints,
    amountYen: share.floor + (extraByMember.get(share.memberId) ?? 0)
  }));
}

export function equalRatios(memberIds: string[]): RatioInput[] {
  if (memberIds.length === 0) return [];
  const base = Math.floor(BASIS_POINTS_TOTAL / memberIds.length);
  let remaining = BASIS_POINTS_TOTAL - base * memberIds.length;
  return memberIds.map((memberId) => {
    const extra = remaining > 0 ? 1 : 0;
    remaining -= extra;
    return { memberId, basisPoints: base + extra };
  });
}

export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / 100;
}

export function percentToBasisPoints(percent: number): number {
  return Math.round(percent * 100);
}
