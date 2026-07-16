// ============================================================
// カテゴリ定数の一元管理
// 色を変更する場合はここだけ編集すればOK
// ============================================================

// ---------- 色定義 ----------
export const CATEGORY_COLORS = {
  EX: "#4f4437", // 絶滅
  EW: "#84618c", // 野生絶滅
  CR: "#d81e05", // 絶滅危惧ⅠA類
  EN: "#d81e05", // 絶滅危惧ⅠB類
  CREN: "#d81e05", // 絶滅危惧Ⅰ類（CR+EN）
  VU: "#ffcb0d", // 絶滅危惧Ⅱ類
  NT: "#97c215", // 準絶滅危惧
  DD: "#c2c2c2", // 情報不足
  LP: "#5ba3c9", // 地域個体群
  OTHER: "#52bd1c", // その他（"その他重要種"など主要カテゴリ外の指定あり）
  NONE: "#ffffff", // 指定なし（データなし）
} as const;

// ---------- 文字色定義 ----------
export const CATEGORY_TEXT_COLORS = {
  EX: "#ffffff",
  EW: "#ffffff",
  CR: "#fffacd",
  EN: "#fffacd",
  CREN: "#fffacd",
  VU: "#333333",
  NT: "#333333",
  DD: "#333333",
  LP: "#ffffff", // 新規追加
  OTHER: "#333333",
} as const;

// ---------- 優先順位（希少性が高いほど小さい値） ----------
export const CATEGORY_PRIORITY: Record<string, number> = {
  EX: 1,
  EW: 2,
  CR: 3,
  EN: 4,
  CREN: 5,
  VU: 6,
  NT: 7,
  DD: 8,
  LP: 9,
  OTHER: 10,
};

// ---------- カテゴリマッピング（各自治体の表記 → 統一グループ） ----------
export const CATEGORY_MAPPINGS: Record<string, string[]> = {
  EX: ["絶滅(EX)", "絶滅（EX）", "絶滅", "EX", "絶滅種"],
  EW: ["野生絶滅(EW)", "野生絶滅（EW）", "野生絶滅", "EW"],
  CR: ["絶滅危惧ⅠA類(CR)", "絶滅危惧ⅠA類（CR）", "絶滅危惧ⅠA類", "ⅠA類", "CR"],
  EN: ["絶滅危惧ⅠB類(EN)", "絶滅危惧ⅠB類（EN）", "絶滅危惧ⅠB類", "ⅠB類", "EN"],
  CREN: ["絶滅危惧Ⅰ類（CR+EN）", "絶滅危惧Ⅰ類", "Ⅰ類"],
  VU: ["絶滅危惧Ⅱ類（VU）", "絶滅危惧Ⅱ類", "Ⅱ類", "VU", "絶滅危機増大種"],
  NT: ["準絶滅危惧（NT）", "準絶滅危惧", "準絶滅危惧種", "希少種", "NT"],
  DD: ["情報不足(DD)", "情報不足（DD）", "情報不足", "DD", "要注目種"],
  LP: ["地域個体群（LP）", "地域個体群", "LP", "絶滅のおそれのある地域個体群"],
  OTHER: ["その他重要種", "分布上重要種"],
};

export const CATEGORY_LABEL: Record<string, string> = {
  EX: "絶滅",
  EW: "野生絶滅",
  CR: "絶滅危惧Ⅰ類",
  EN: "絶滅危惧Ⅰ類",
  CREN: "絶滅危惧Ⅰ類",
  VU: "絶滅危惧Ⅱ類",
  NT: "準絶滅危惧",
  DD: "情報不足",
  LP: "地域個体群",
  OTHER: "その他",
};

// ---------- 都道府県コード（JIS X 0401） ----------
export const PREFECTURE_CODES: Record<string, number> = {
  北海道: 1,
  青森県: 2,
  岩手県: 3,
  宮城県: 4,
  秋田県: 5,
  山形県: 6,
  福島県: 7,
  茨城県: 8,
  栃木県: 9,
  群馬県: 10,
  埼玉県: 11,
  千葉県: 12,
  東京都: 13,
  神奈川県: 14,
  新潟県: 15,
  富山県: 16,
  石川県: 17,
  福井県: 18,
  山梨県: 19,
  長野県: 20,
  岐阜県: 21,
  静岡県: 22,
  愛知県: 23,
  三重県: 24,
  滋賀県: 25,
  京都府: 26,
  大阪府: 27,
  兵庫県: 28,
  奈良県: 29,
  和歌山県: 30,
  鳥取県: 31,
  島根県: 32,
  岡山県: 33,
  広島県: 34,
  山口県: 35,
  徳島県: 36,
  香川県: 37,
  愛媛県: 38,
  高知県: 39,
  福岡県: 40,
  佐賀県: 41,
  長崎県: 42,
  熊本県: 43,
  大分県: 44,
  宮崎県: 45,
  鹿児島県: 46,
  沖縄県: 47,
};

// ---------- 都道府県コード → 都道府県名（逆引き） ----------
export const CODE_TO_PREF: Record<number, string> = Object.fromEntries(
  Object.entries(PREFECTURE_CODES).map(([name, code]) => [code, name]),
);

// ============================================================
// ユーティリティ関数
// ============================================================

// カテゴリ文字列 → 統一グループキー（EX / CR / EN ...）
export function getCategoryGroup(category: string): string {
  if (!category) return "OTHER";
  for (const [group, variations] of Object.entries(CATEGORY_MAPPINGS)) {
    if (variations.includes(category)) return group;
  }
  return "OTHER";
}

// カテゴリ文字列 → 地図塗り色（hex）
// null/空 = データなし（NONE/白）、文字列あり = 何らかの指定あり（最低でもOTHER）
export function getCategoryColor(unified: string | null): string {
  if (!unified) return CATEGORY_COLORS.NONE;
  return (
    CATEGORY_COLORS[unified as keyof typeof CATEGORY_COLORS] ??
    CATEGORY_COLORS.OTHER
  );
}

// カテゴリ文字列 → CSSクラス名（category-ex など）
export function getCategoryClass(unified: string): string {
  switch (unified) {
    case "EX":
      return "category-ex";
    case "EW":
      return "category-ew";
    case "CR":
      return "category-cr";
    case "EN":
      return "category-en";
    case "CREN":
      return "category-cren";
    case "VU":
      return "category-vu";
    case "NT":
      return "category-nt";
    case "DD":
      return "category-dd";
    case "LP":
      return "category-lp"; 
    default:
      return "category-other";
  }
}

// カテゴリが主要カテゴリかどうか
const MAJOR_CATEGORIES = new Set([
  "EX",
  "EW",
  "CR",
  "EN",
  "CREN",
  "VU",
  "NT",
  "DD",
  "LP",
]);
export function isMajorCategory(unified: string): boolean {
  return MAJOR_CATEGORIES.has(unified);
}

// カテゴリが同じグループかどうか（フィルタリング用）
export function isSameCategory(unified: string, filter: string): boolean {
  if (!unified || !filter) return false;
  if (filter === "OTHER") return !isMajorCategory(unified);
  return unified === filter;
}
