// ============================================================
// カテゴリ定数の一元管理
// 色を変更する場合はここだけ編集すればOK
// ============================================================

// ---------- 色定義 ----------
export const CATEGORY_COLORS = {
  EX: "#4f4437", // 絶滅
  EW: "#84618c", // 野生絶滅
  CR: "#d81e05", // 絶滅危惧ⅠA類
  EN: "#f28633", // 絶滅危惧ⅠB類
  CREN: "#d81e05", // 絶滅危惧Ⅰ類（CR+EN）
  VU: "#ffcb0d", // 絶滅危惧Ⅱ類
  NT: "#97c215", // 準絶滅危惧
  DD: "#c2c2c2", // 情報不足
  OTHER: "#52bd1c", // その他（"その他重要種"など主要カテゴリ外の指定あり）
  NONE: "#ffffff", // 指定なし（データなし）
} as const;

// ---------- 文字色定義 ----------
export const CATEGORY_TEXT_COLORS = {
  EX: "#ffffff",
  EW: "#ffffff",
  CR: "#fffacd",
  EN: "#333333",
  CREN: "#fffacd",
  VU: "#333333",
  NT: "#333333",
  DD: "#333333",
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
  OTHER: 9,
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
  OTHER: ["その他重要種", "分布上重要種"],
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
export function getCategoryColor(category: string | null): string {
  if (!category) return CATEGORY_COLORS.NONE;
  if (
    (category.includes("絶滅") || category.includes("EX")) &&
    !category.includes("危惧") &&
    !category.includes("野生")
  )
    return CATEGORY_COLORS.EX;
  if (category.includes("野生絶滅") || category.includes("EW"))
    return CATEGORY_COLORS.EW;
  if (category.includes("CR") || category.includes("絶滅危惧ⅠA類"))
    return CATEGORY_COLORS.CR;
  if (category.includes("EN") || category.includes("絶滅危惧ⅠB類"))
    return CATEGORY_COLORS.EN;
  if (category.includes("CR+EN") || category.includes("絶滅危惧Ⅰ類"))
    return CATEGORY_COLORS.CREN;
  if (category.includes("VU") || category.includes("絶滅危惧Ⅱ類"))
    return CATEGORY_COLORS.VU;
  if (category.includes("NT") || category.includes("準絶滅危惧"))
    return CATEGORY_COLORS.NT;
  if (category.includes("DD") || category.includes("情報不足"))
    return CATEGORY_COLORS.DD;
  return CATEGORY_COLORS.OTHER; // "その他重要種"など
}

// カテゴリ文字列 → CSSクラス名（category-ex など）
export function getCategoryClass(category: string): string {
  if (!category) return "category-other";
  if (
    (category.includes("絶滅") || category.includes("EX")) &&
    !category.includes("危惧") &&
    !category.includes("野生")
  )
    return "category-ex";
  if (category.includes("野生絶滅") || category.includes("EW"))
    return "category-ew";
  if (category.includes("ⅠA") || category.includes("CR")) return "category-cr";
  if (category.includes("ⅠB") || category.includes("EN")) return "category-en";
  if (category.includes("Ⅰ類")) return "category-cren";
  if (category.includes("Ⅱ") || category.includes("VU")) return "category-vu";
  if (category.includes("準絶滅") || category.includes("NT"))
    return "category-nt";
  if (category.includes("情報不足") || category.includes("DD"))
    return "category-dd";
  return "category-other";
}

// カテゴリが主要カテゴリかどうか
export function isMajorCategory(category: string): boolean {
  if (!category) return false;
  return Object.values(CATEGORY_MAPPINGS).some((variations) =>
    variations.some((v) => category.includes(v) || v.includes(category)),
  );
}

// カテゴリが同じグループかどうか（フィルタリング用）
export function isSameCategory(
  category: string,
  filterCategory: string,
): boolean {
  if (!category || !filterCategory) return false;
  if (category === filterCategory) return true;
  if (filterCategory === "OTHER") return !isMajorCategory(category);
  for (const variations of Object.values(CATEGORY_MAPPINGS)) {
    if (variations.includes(category) && variations.includes(filterCategory))
      return true;
  }
  return false;
}
