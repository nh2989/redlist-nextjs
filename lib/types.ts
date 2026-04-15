// ============================================================
// プロジェクト共通型定義
// ============================================================

/**
 * JSONファイルの1レコード（読み込み直後の生データ）
 * public/data/*.json の各エントリに対応
 */
export type RawSpeciesRecord = {
  species_name: string;
  species_aliases: string | string[] | null;
  scientific_name: string;
  taxonomy: string;
  jurisdiction_name: string;
  jurisdiction_type: "national" | "prefecture" | "municipality";
  parent_prefecture: string | null;
  category: string;
  category_unified: string;
  source_id: string;
  publication_year: string | null;
};

/**
 * 自治体ごとの指定状況（groupBySpecies 後）
 * SpeciesGroup.jurisdictions の各要素
 */
export type Jurisdiction = {
  jurisdiction_name: string;
  jurisdiction_type: "national" | "prefecture" | "municipality";
  parent_prefecture: string | null;
  category: string;
  category_unified: string;
  scientific_name: string;
  source_id: string;
  original_name: string;
  original_aliases: string[];
  publication_year: string | null;
};

/**
 * 和名でグルーピングされた種（検索結果1件）
 * groupBySpecies() の戻り値の要素
 */
export type SpeciesGroup = {
  species_name: string;
  species_aliases: string[];
  scientific_name: string;
  taxonomy: string;
  jurisdictions: Jurisdiction[];
};

export type SourceRecord = {
  id: string;
  jurisdiction_name: string;
  jurisdiction_type: string;
  title: string;
  publication_year: string;
  publisher: string;
  url: string;
};
