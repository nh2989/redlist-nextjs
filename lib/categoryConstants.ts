// ============================================================
// カテゴリ定数の一元管理
// 色を変更する場合はここだけ編集すればOK
// ============================================================

// ============================================================
// 色定義
// ============================================================

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

export const CATEGORY_TEXT_COLORS = {
  EX: "#ffffff",
  EW: "#ffffff",
  CR: "#fffacd",
  EN: "#fffacd",
  CREN: "#fffacd",
  VU: "#333333",
  NT: "#333333",
  DD: "#333333",
  LP: "#ffffff",
  OTHER: "#333333",
} as const;

// ============================================================
// カテゴリ定数・型
// ============================================================

// フィルター用全カテゴリ一覧
export const ALL_CATEGORIES = [
  "EX",
  "EW",
  "CR",
  "EN",
  "CREN",
  "VU",
  "NT",
  "DD",
  "LP",
  "OTHER",
] as const;
export type CategoryKey = (typeof ALL_CATEGORIES)[number];

// ドロップダウン・タグ用表示名
// CATEGORY_LABEL（モーダルの統一カテゴリ列など）とは別に、
// フィルターUIでは正式名称＋略号を表示する
export const CATEGORY_DISPLAY: Record<string, string> = {
  EX: "絶滅（EX）",
  EW: "野生絶滅（EW）",
  CREN: "絶滅危惧Ⅰ類（CR+EN）",
  CR: "絶滅危惧ⅠＡ類（CR）",
  EN: "絶滅危惧ⅠＢ類（EN）",
  VU: "絶滅危惧Ⅱ類（VU）",
  NT: "準絶滅危惧（NT）",
  DD: "情報不足（DD）",
  LP: "地域個体群（LP）",
  OTHER: "その他",
};

// モーダルの統一カテゴリ列・環境省ステータス表示用
// CR・EN・CRENはすべて「絶滅危惧Ⅰ類」として表示
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

// 優先順位（希少性が高いほど小さい値）
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

// カテゴリマッピング（各自治体の表記 → 統一グループ）
// データパイプライン・ingestion用。ランタイムでは使用しない
export const CATEGORY_MAPPINGS: Record<string, string[]> = {
  EX: ["絶滅(EX)", "絶滅（EX）", "絶滅", "EX", "絶滅種"],
  EW: ["野生絶滅(EW)", "野生絶滅（EW）", "野生絶滅", "EW"],
  CR: [
    "絶滅危惧ⅠA類(CR)",
    "絶滅危惧ⅠA類（CR）",
    "絶滅危惧ⅠA類",
    "絶滅危惧ⅠＡ類(CR)",
    "絶滅危惧ⅠＡ類（CR）",
    "絶滅危惧ⅠＡ類",
    "ⅠA類",
    "ⅠＡ類",
    "CR",
  ],
  EN: [
    "絶滅危惧ⅠB類(EN)",
    "絶滅危惧ⅠB類（EN）",
    "絶滅危惧ⅠB類",
    "絶滅危惧ⅠＢ類(EN)",
    "絶滅危惧ⅠＢ類（EN）",
    "絶滅危惧ⅠＢ類",
    "ⅠB類",
    "ⅠＢ類",
    "EN",
  ],
  CREN: ["絶滅危惧Ⅰ類（CR+EN）", "絶滅危惧Ⅰ類", "Ⅰ類"],
  VU: ["絶滅危惧Ⅱ類（VU）", "絶滅危惧Ⅱ類", "Ⅱ類", "VU", "絶滅危機増大種"],
  NT: ["準絶滅危惧（NT）", "準絶滅危惧", "準絶滅危惧種", "希少種", "NT"],
  DD: ["情報不足(DD)", "情報不足（DD）", "情報不足", "DD", "要注目種"],
  LP: ["地域個体群（LP）", "地域個体群", "LP", "絶滅のおそれのある地域個体群"],
  OTHER: ["その他重要種", "分布上重要種"],
};

// ============================================================
// 地図・分類群
// ============================================================

// 分類群ドット色（検索結果カードのグループヘッダー用）
export const TAXONOMY_DOT_COLOR: Record<string, string> = {
  哺乳類: "#185fa5",
  鳥類: "#378add",
  爬虫類: "#534ab7",
  両生類: "#7f77dd",
  淡水魚類: "#0c447c",
  昆虫類: "#ba7517",
  甲殻類: "#993c1d",
  軟体動物: "#d85a30",
  その他無脊椎動物: "#888780",
  維管束植物: "#3b6d11",
  蘚苔類: "#639922",
  藻類: "#1d9e75",
  地衣類: "#0f6e56",
  菌類: "#444441",
};

// 分類群絵文字（フィルターUI用）
export const TAXONOMY_EMOJI: Record<string, string> = {
  哺乳類: "🦌",
  鳥類: "🐦",
  爬虫類: "🦎",
  両生類: "🐸",
  淡水魚類: "🐟",
  昆虫類: "🦋",
  甲殻類: "🦀",
  軟体動物: "🐚",
  その他無脊椎動物: "🔹",
  維管束植物: "🌿",
  蘚苔類: "🌱",
  藻類: "🌊",
  地衣類: "🍃",
  菌類: "🍄",
};

// ============================================================
// 都道府県
// ============================================================

// 都道府県コード（JIS X 0401）
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

// 都道府県コード → 都道府県名（逆引き）
export const CODE_TO_PREF: Record<number, string> = Object.fromEntries(
  Object.entries(PREFECTURE_CODES).map(([name, code]) => [code, name]),
);

// ============================================================
// ユーティリティ関数
// ============================================================

/**
 * 都道府県名から「都」「府」「県」を省略する
 * 例: 「滋賀県」→「滋賀」「東京都」→「東京」「大阪府」→「大阪」
 * 「北海道」はそのまま
 */
export function shortenPrefectureName(name: string): string {
  return name.replace(/[都府県]$/, "");
}

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
// 完全一致のみ。CREN は CR でも EN でもマッチしない（意図的な設計）
export function isSameCategory(unified: string, filter: string): boolean {
  if (!unified || !filter) return false;
  if (filter === "OTHER") return !isMajorCategory(unified);
  return unified === filter;
}

// 分類群ドット色
export function getTaxonomyDotColor(taxonomy: string): string {
  return TAXONOMY_DOT_COLOR[taxonomy] ?? "#888780";
}

// ============================================================
// フィルター操作ユーティリティ
// ============================================================

// カテゴリ全選択判定
export function isAllCategoriesSelected(filters: string[]): boolean {
  return ALL_CATEGORIES.every((c) => filters.includes(c));
}

/**
 * カテゴリのトグル処理（CREN/CR/EN連動ロジック含む）
 * - CREN をオン → CR・EN も自動オン
 * - CREN をオフ → CR・EN も自動オフ
 * - CR か EN をオフ → CREN も自動オフ
 * - CR・EN を手動で両方オンにしても CREN はオフのまま
 *   （Ⅰ類をCR/ENに分割している都道府県のみ表示したい場合に有用）
 */
export function toggleCategoryValue(prev: string[], value: string): string[] {
  if (prev.includes(value)) {
    if (value === "CREN") {
      return prev.filter((v) => v !== "CREN" && v !== "CR" && v !== "EN");
    }
    if (value === "CR" || value === "EN") {
      return prev.filter((v) => v !== value && v !== "CREN");
    }
    return prev.filter((v) => v !== value);
  } else {
    if (value === "CREN") {
      return [...new Set([...prev, "CREN", "CR", "EN"])];
    }
    return [...prev, value];
  }
}
