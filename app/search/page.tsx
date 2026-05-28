"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import dynamic from "next/dynamic";
const SpeciesMap = dynamic(() => import("../components/SpeciesMap"), {
  ssr: false,
});

import {
  CATEGORY_LABEL,
  CATEGORY_PRIORITY,
  PREFECTURE_CODES,
  getCategoryClass,
  isMajorCategory,
  isSameCategory,
} from "@/lib/categoryConstants";

import type {
  RawSpeciesRecord,
  Jurisdiction,
  SpeciesGroup,
  SourceRecord,
} from "@/lib/types";

// 種の最も高い希少性カテゴリを取得する関数（階層優先）
function getHighestPriorityCategory(jurisdictions: Jurisdiction[]): number {
  // 国 -> 都道府県 -> 市町村の順で確認
  const typeOrder = ["national", "prefecture", "municipality"] as const;

  for (const type of typeOrder) {
    const filtered = jurisdictions.filter((j) => j.jurisdiction_type === type);
    if (filtered.length > 0) {
      let highestPriority = 999;
      filtered.forEach((j: Jurisdiction) => {
        const priority = CATEGORY_PRIORITY[j.category_unified] ?? 999;
        if (priority < highestPriority) {
          highestPriority = priority;
        }
      });
      return highestPriority;
    }
  }

  return 999;
}

// 別名を正規化する関数
function normalizeAliases(
  aliases: string | string[] | null | undefined,
): string[] {
  if (!aliases) return [];
  if (aliases === "") return [];
  if (Array.isArray(aliases)) {
    return aliases.filter((a) => a && a.trim() !== "");
  }
  if (typeof aliases === "string") {
    return aliases
      .split("|")
      .map((a) => a.trim())
      .filter((a) => a !== "");
  }
  return [];
}

function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URLパラメータから初期値を取得
  const initialSearchTerm = searchParams.get("q") || "";

  const initialCategories = searchParams.getAll("category");
  const initialPrefectures = searchParams.getAll("prefecture");

  const initialMunicipality = searchParams.get("municipality") || "";
  const initialTaxonomy = searchParams.get("taxonomy") || "";
  const initialSort = searchParams.get("sort") || "name";

  // State（状態管理）
  const [allSpeciesData, setAllSpeciesData] = useState<RawSpeciesRecord[]>([]);
  const [groupedData, setGroupedData] = useState<SpeciesGroup[]>([]);
  const [filteredData, setFilteredData] = useState<SpeciesGroup[]>([]);
  const [displayData, setDisplayData] = useState<SpeciesGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  const [categoryFilters, setCategoryFilters] =
    useState<string[]>(initialCategories);
  const [prefectureFilters, setPrefectureFilters] =
    useState<string[]>(initialPrefectures);

  // ドロップダウンの開閉
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isPrefectureOpen, setIsPrefectureOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const prefectureDropdownRef = useRef<HTMLDivElement>(null);

  const [municipalityFilter, setMunicipalityFilter] =
    useState(initialMunicipality);
  const [taxonomyFilter, setTaxonomyFilter] = useState(initialTaxonomy);
  const [sortOrder, setSortOrder] = useState(initialSort);
  const [loading, setLoading] = useState(true);
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesGroup | null>(
    null,
  );
  const [sourceMap, setSourceMap] = useState<Record<string, SourceRecord>>({});

  // 市町村リスト（選択された都道府県に応じて変化）
  const [availableMunicipalities, setAvailableMunicipalities] = useState<
    string[]
  >([]);

  const [includeMunicipalities, setIncludeMunicipalities] = useState(true);

  // オートコンプリート用
  const [autocompleteItems, setAutocompleteItems] = useState<SpeciesGroup[]>(
    [],
  );
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function toggleCategoryFilter(value: string) {
    setCategoryFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function togglePrefectureFilter(value: string) {
    setPrefectureFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  // データ読み込み（初回のみ）
  useEffect(() => {
    loadData();
  }, []);

  // データ読み込み関数
  async function loadData() {
    setLoading(true);
    try {
      const dataFiles = [
        { id: "national", path: "/data/national.json" },
        { id: "shiga_2025", path: "/data/shiga_2025.json" },
        { id: "kyoto", path: "/data/kyoto.json" },
        { id: "aichi", path: "/data/aichi.json" },
        { id: "hiroshima", path: "/data/hiroshima.json" },
        { id: "koka", path: "/data/koka.json" },
        { id: "hikone", path: "/data/hikone.json" },
        { id: "shimane", path: "/data/shimane.json" },
        { id: "fukui", path: "/data/fukui.json" },
        { id: "gifu", path: "/data/gifu.json" },
        { id: "mie", path: "/data/mie.json" },
      ];

      // sources.json と synonyms.json をデータファイルと並列でfetch
      const [sourcesRes, synonymsRes, ...dataResponses] = await Promise.all([
        fetch("/data/sources.json"),
        fetch("/data/synonyms.json").catch(() => null),
        ...dataFiles.map((f) => fetch(f.path).catch(() => null)),
      ]);

      const synonyms: Record<string, string> = synonymsRes
        ? await synonymsRes.json().catch(() => ({}))
        : {};

      // source_id → source オブジェクトのマップを作成
      const sources: SourceRecord[] = await sourcesRes.json().catch(() => []);
      const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]));
      setSourceMap(sourceMap); // ← この行を追加するだけ

      const dataArrays = await Promise.all(
        dataResponses.map((res) =>
          res ? res.json().catch(() => []) : Promise.resolve([]),
        ),
      );

      // source_id と publication_year を各レコードに付与
      const allData: RawSpeciesRecord[] = dataFiles.flatMap((file, i) => {
        const items: RawSpeciesRecord[] = dataArrays[i] ?? [];
        return items.map((item) => ({
          ...item,
          source_id: file.id,
          species_aliases: normalizeAliases(item.species_aliases),
          publication_year: sourceMap[file.id]?.publication_year ?? null,
        }));
      });

      setAllSpeciesData(allData);

      // グループ化
      const grouped = groupBySpecies(allData, synonyms);

      setGroupedData(grouped);
    } catch (error) {
      console.error("データ読み込みエラー:", error);
    } finally {
      setLoading(false);
    }
  }

  // グループ化関数（和名でグループ化）
  function groupBySpecies(
    data: RawSpeciesRecord[],
    synonyms: Record<string, string>,
  ): SpeciesGroup[] {
    const speciesMap: Record<string, SpeciesGroup> = {};

    data.forEach((item) => {
      const key = synonyms[item.species_name] ?? item.species_name;

      if (!speciesMap[key]) {
        speciesMap[key] = {
          species_name: key,
          species_aliases: (item.species_aliases as string[]) || [],
          scientific_name: item.scientific_name,
          taxonomy: item.taxonomy,
          jurisdictions: [],
        };
      }

      // シノニム変換された元の名前をaliasに追加
      if (
        synonyms[item.species_name] &&
        !speciesMap[key].species_aliases.includes(item.species_name)
      ) {
        speciesMap[key].species_aliases.push(item.species_name);
      }

      speciesMap[key].jurisdictions.push({
        jurisdiction_name: item.jurisdiction_name,
        jurisdiction_type: item.jurisdiction_type,
        parent_prefecture: item.parent_prefecture,
        category: item.category,
        category_unified: item.category_unified,
        scientific_name: item.scientific_name,
        source_id: item.source_id,
        original_name: item.species_name,
        original_aliases: (item.species_aliases as string[]) || [],
        publication_year: item.publication_year,
      });
    });

    // 各種の自治体を並べ替え
    Object.values(speciesMap).forEach((species: SpeciesGroup) => {
      species.jurisdictions.sort((a: Jurisdiction, b: Jurisdiction) => {
        // 種別順: national -> prefecture -> municipality
        const typeOrder: Record<string, number> = {
          national: 0,
          prefecture: 1,
          municipality: 2,
        };
        if (typeOrder[a.jurisdiction_type] !== typeOrder[b.jurisdiction_type]) {
          return (
            typeOrder[a.jurisdiction_type] - typeOrder[b.jurisdiction_type]
          );
        }

        // 都道府県コード順
        const codeA = PREFECTURE_CODES[a.jurisdiction_name] || 999;
        const codeB = PREFECTURE_CODES[b.jurisdiction_name] || 999;
        return codeA - codeB;
      });
    });

    return Object.values(speciesMap);
  }

  // 都道府県が変更されたら市町村リストを更新
  useEffect(() => {
    const nonNationalPrefs = prefectureFilters.filter((p) => p !== "環境省");
    if (nonNationalPrefs.length > 0) {
      const municipalities = allSpeciesData
        .filter(
          (item) =>
            item.jurisdiction_type === "municipality" &&
            nonNationalPrefs.includes(item.parent_prefecture ?? ""),
        )
        .map((item) => item.jurisdiction_name);
      setAvailableMunicipalities(Array.from(new Set(municipalities)).sort());
    } else {
      setAvailableMunicipalities([]);
      setMunicipalityFilter("");
    }
  }, [prefectureFilters, allSpeciesData]);

  // フィルタリング処理
  useEffect(() => {
    filterResults();
  }, [
    searchTerm,
    categoryFilters,
    prefectureFilters,
    municipalityFilter,
    taxonomyFilter,
    includeMunicipalities, // ← 追加
    groupedData,
  ]);

  function filterResults() {
    let filtered = groupedData;

    // テキスト検索（変更なし）
    if (searchTerm) {
      filtered = filtered.filter((species) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          species.species_name.toLowerCase().includes(searchLower) ||
          species.species_aliases.some((alias: string) =>
            alias.toLowerCase().includes(searchLower),
          ) ||
          species.scientific_name.toLowerCase().includes(searchLower)
        );
      });
    }

    // カテゴリ・都道府県・市町村の複合フィルター（統合）
    const hasCat = categoryFilters.length > 0;
    const hasPref = prefectureFilters.length > 0;
    const hasMuni = !!municipalityFilter;

    if (hasCat || hasPref || hasMuni) {
      filtered = filtered.filter((species) =>
        species.jurisdictions.some((j: Jurisdiction) => {
          const matchCat =
            !hasCat ||
            categoryFilters.some((cat) =>
              isSameCategory(j.category_unified, cat),
            );

          const matchPref =
            !hasPref ||
            prefectureFilters.includes(j.jurisdiction_name) ||
            (includeMunicipalities &&
              prefectureFilters.some((pref) => j.parent_prefecture === pref));

          const matchMuni =
            !hasMuni || j.jurisdiction_name === municipalityFilter;
          return matchCat && matchPref && matchMuni;
        }),
      );
    }

    // 分類フィルター（変更なし）
    if (taxonomyFilter) {
      filtered = filtered.filter(
        (species) => species.taxonomy === taxonomyFilter,
      );
    }

    setFilteredData(filtered);
  }

  // ドロップダウン外クリックで閉じる処理
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
      if (
        prefectureDropdownRef.current &&
        !prefectureDropdownRef.current.contains(e.target as Node)
      ) {
        setIsPrefectureOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 並び替え処理
  useEffect(() => {
    sortResults();
  }, [filteredData, sortOrder]);

  function sortResults() {
    let sorted = [...filteredData];

    if (sortOrder === "name") {
      sorted.sort((a, b) => a.species_name.localeCompare(b.species_name, "ja"));
    } else if (sortOrder === "jurisdiction-desc") {
      sorted.sort((a, b) => {
        const countA = filterJurisdictionsForDisplay(a.jurisdictions).length;
        const countB = filterJurisdictionsForDisplay(b.jurisdictions).length;
        return countB - countA;
      });
    } else if (sortOrder === "jurisdiction-asc") {
      sorted.sort((a, b) => {
        const countA = filterJurisdictionsForDisplay(a.jurisdictions).length;
        const countB = filterJurisdictionsForDisplay(b.jurisdictions).length;
        return countA - countB;
      });
    } else if (sortOrder === "scientific") {
      sorted.sort((a, b) => a.scientific_name.localeCompare(b.scientific_name));
    } else if (sortOrder === "category") {
      // カテゴリー順（希少性の高い順）
      sorted.sort((a, b) => {
        // フィルタ適用後の自治体で比較
        const visibleJurisdictionsA = filterJurisdictionsForDisplay(
          a.jurisdictions,
        );
        const visibleJurisdictionsB = filterJurisdictionsForDisplay(
          b.jurisdictions,
        );

        const priorityA = getHighestPriorityCategory(visibleJurisdictionsA);
        const priorityB = getHighestPriorityCategory(visibleJurisdictionsB);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // カテゴリが同じ場合は種名順
        return a.species_name.localeCompare(b.species_name, "ja");
      });
    }

    setDisplayData(sorted);
  }

  // オートコンプリート候補を生成
  useEffect(() => {
    if (searchTerm.length >= 1) {
      const candidates = groupedData
        .filter((species) => {
          const searchLower = searchTerm.toLowerCase();
          return (
            species.species_name.toLowerCase().includes(searchLower) ||
            species.species_aliases.some((alias: string) =>
              alias.toLowerCase().includes(searchLower),
            ) ||
            species.scientific_name.toLowerCase().includes(searchLower)
          );
        })
        .slice(0, 8);

      setAutocompleteItems(candidates);
      setShowAutocomplete(candidates.length > 0);
    } else {
      setShowAutocomplete(false);
    }
  }, [searchTerm, groupedData]);

  // オートコンプリート項目を選択
  function selectAutocompleteItem(species: SpeciesGroup) {
    setSearchTerm(species.species_name);
    setShowAutocomplete(false);
    setAutocompleteIndex(-1);
  }

  // キーボード操作
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showAutocomplete) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAutocompleteIndex((prev) =>
        prev < autocompleteItems.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAutocompleteIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (autocompleteIndex >= 0) {
        selectAutocompleteItem(autocompleteItems[autocompleteIndex]);
      }
    } else if (e.key === "Escape") {
      setShowAutocomplete(false);
      setAutocompleteIndex(-1);
    }
  }

  // 検索ボックスクリア
  function clearSearch() {
    setSearchTerm("");
    setShowAutocomplete(false);
    searchInputRef.current?.focus();
  }

  // トップページに戻る
  function goToTop() {
    router.push("/");
  }

  // 自治体種別のアイコン
  function getJurisdictionIcon(type: string) {
    if (type === "national") return "🏛️";
    if (type === "prefecture") return "🗾";
    if (type === "municipality") return "🏘️";
    return "📍";
  }

  // モーダルを開く
  function openModal(species: SpeciesGroup) {
    setSelectedSpecies(species);
    document.body.style.overflow = "hidden";
  }

  // モーダルを閉じる
  function closeModal() {
    setSelectedSpecies(null);
    document.body.style.overflow = "";
  }

  // 読み込み中
  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  // 表示用に自治体をフィルタリングする関数
  function filterJurisdictionsForDisplay(
    jurisdictions: Jurisdiction[],
  ): Jurisdiction[] {
    let filtered = jurisdictions;

    if (categoryFilters.length > 0) {
      filtered = filtered.filter((j: Jurisdiction) =>
        categoryFilters.some((cat) => isSameCategory(j.category_unified, cat)),
      );
    }

    if (prefectureFilters.length > 0) {
      filtered = filtered.filter(
        (j: Jurisdiction) =>
          prefectureFilters.includes(j.jurisdiction_name) ||
          (includeMunicipalities &&
            prefectureFilters.some((pref) => j.parent_prefecture === pref)),
      );
    }

    if (municipalityFilter) {
      filtered = filtered.filter(
        (j: Jurisdiction) => j.jurisdiction_name === municipalityFilter,
      );
    }

    return filtered;
  }

  // 自治体を階層別に分類
  function groupJurisdictionsByType(jurisdictions: Jurisdiction[]) {
    const national = jurisdictions.filter(
      (j) => j.jurisdiction_type === "national",
    );
    const prefecture = jurisdictions.filter(
      (j) => j.jurisdiction_type === "prefecture",
    );
    const municipality = jurisdictions.filter(
      (j) => j.jurisdiction_type === "municipality",
    );

    return { national, prefecture, municipality };
  }

  return (
    <>
      <div className="container">
        <header>
          <h1>🌿 レッドデータ検索システム</h1>
          <p className="subtitle">検索結果</p>
          <button
            onClick={goToTop}
            className="btn-back"
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ← トップページに戻る
          </button>
        </header>

        <div className="search-section">
          <div className="search-box-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              id="searchBox"
              placeholder="種名・別名・学名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchTerm && (
              <button
                className="clear-search-btn"
                onClick={clearSearch}
                aria-label="検索クリア"
              >
                ×
              </button>
            )}

            {/* オートコンプリート */}
            {showAutocomplete && (
              <div className="autocomplete-list">
                {autocompleteItems.map((species, index) => (
                  <div
                    key={index}
                    className={`autocomplete-item ${index === autocompleteIndex ? "active" : ""}`}
                    onClick={() => selectAutocompleteItem(species)}
                  >
                    <div className="autocomplete-name">
                      {species.species_name}
                      {species.species_aliases.length > 0 && (
                        <span
                          style={{
                            fontSize: "0.85em",
                            color: "var(--text-faint)",
                            marginLeft: "8px",
                          }}
                        >
                          （別名: {species.species_aliases.join(", ")}）
                        </span>
                      )}
                    </div>
                    <div className="autocomplete-scientific">
                      {species.scientific_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="filters">
            {/* カテゴリ複数選択 */}
            <div className="multi-select-dropdown" ref={categoryDropdownRef}>
              <button
                className="multi-select-btn"
                onClick={() => setIsCategoryOpen((v) => !v)}
              >
                {categoryFilters.length === 0
                  ? "カテゴリ：すべて"
                  : `カテゴリ：${categoryFilters.length}件選択`}
                <span className="dropdown-arrow">
                  {isCategoryOpen ? "▲" : "▼"}
                </span>
              </button>
              {isCategoryOpen && (
                <div className="multi-select-options">
                  {(
                    [
                      ["EX", "絶滅（EX）"],
                      ["EW", "野生絶滅（EW）"],
                      ["CR", "絶滅危惧ⅠA類（CR）"],
                      ["EN", "絶滅危惧ⅠB類（EN）"],
                      ["CREN", "絶滅危惧Ⅰ類（CR+EN）"],
                      ["VU", "絶滅危惧Ⅱ類（VU）"],
                      ["NT", "準絶滅危惧（NT）"],
                      ["DD", "情報不足（DD）"],
                      ["LP", "地域個体群（LP）"],
                      ["OTHER", "その他"],
                    ] as [string, string][]
                  ).map(([value, label]) => (
                    <label key={value} className="multi-select-option">
                      <input
                        type="checkbox"
                        checked={categoryFilters.includes(value)}
                        onChange={() => toggleCategoryFilter(value)}
                      />
                      {label}
                    </label>
                  ))}
                  {categoryFilters.length > 0 && (
                    <button
                      className="multi-select-clear"
                      onClick={() => setCategoryFilters([])}
                    >
                      クリア
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 都道府県複数選択（環境省含む） */}
            <div className="multi-select-dropdown" ref={prefectureDropdownRef}>
              <button
                className="multi-select-btn"
                onClick={() => setIsPrefectureOpen((v) => !v)}
              >
                {prefectureFilters.length === 0
                  ? "都道府県：すべて"
                  : `都道府県：${prefectureFilters.join("・")}`}
                <span className="dropdown-arrow">
                  {isPrefectureOpen ? "▲" : "▼"}
                </span>
              </button>
              {isPrefectureOpen && (
                <div className="multi-select-options">
                  {/* 環境省を先頭に */}
                  <label className="multi-select-option">
                    <input
                      type="checkbox"
                      checked={prefectureFilters.includes("環境省")}
                      onChange={() => togglePrefectureFilter("環境省")}
                    />
                    🏛️ 環境省
                  </label>
                  <hr
                    style={{
                      margin: "4px 0",
                      border: "none",
                      borderTop: "1px solid var(--border)",
                    }}
                  />
                  {Object.keys(PREFECTURE_CODES)
                    .filter((pref) =>
                      allSpeciesData.some(
                        (item) =>
                          item.jurisdiction_name === pref ||
                          item.parent_prefecture === pref,
                      ),
                    )
                    .sort((a, b) => PREFECTURE_CODES[a] - PREFECTURE_CODES[b])
                    .map((pref) => (
                      <label key={pref} className="multi-select-option">
                        <input
                          type="checkbox"
                          checked={prefectureFilters.includes(pref)}
                          onChange={() => togglePrefectureFilter(pref)}
                        />
                        {pref}
                      </label>
                    ))}
                  {prefectureFilters.length > 0 && (
                    <button
                      className="multi-select-clear"
                      onClick={() => setPrefectureFilters([])}
                    >
                      クリア
                    </button>
                  )}
                </div>
              )}
            </div>

            {prefectureFilters.length > 0 &&
              availableMunicipalities.length > 0 && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "var(--fs-sm)",
                    color: "var(--text-body)",
                    cursor: "pointer",
                    padding: "4px 0",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeMunicipalities}
                    onChange={(e) => setIncludeMunicipalities(e.target.checked)}
                  />
                  市町村を含む
                </label>
              )}

            {/* 市町村・分類群・ソートは変更なし */}
            {availableMunicipalities.length > 0 && (
              <select
                value={municipalityFilter}
                onChange={(e) => {
                  setMunicipalityFilter(e.target.value);
                  if (e.target.value) setIncludeMunicipalities(true);
                }}
              >
                <option value="">市町村：すべて</option>
                {availableMunicipalities.map((muni) => (
                  <option key={muni} value={muni}>
                    {muni}
                  </option>
                ))}
              </select>
            )}

            <select
              value={taxonomyFilter}
              onChange={(e) => setTaxonomyFilter(e.target.value)}
            >
              <option value="">分類群：すべて</option>
              {Array.from(new Set(allSpeciesData.map((item) => item.taxonomy)))
                .filter(Boolean)
                .sort()
                .map((tax) => (
                  <option key={tax} value={tax}>
                    {tax}
                  </option>
                ))}
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="name">種名順</option>
              <option value="category">カテゴリ順（希少性）</option>
              <option value="jurisdiction-desc">指定箇所数（多い順）</option>
              <option value="jurisdiction-asc">指定箇所数（少ない順）</option>
              <option value="scientific">学名順</option>
            </select>
          </div>

          <div id="resultCount" className="result-count">
            {displayData.length}件の種が見つかりました
          </div>
        </div>

        <div id="results" className="results">
          {displayData.length === 0 ? (
            <div className="no-results">該当する種が見つかりませんでした。</div>
          ) : (
            displayData.map((species, index) => {
              // フィルター条件に合致する自治体のみ表示
              const visibleJurisdictions = filterJurisdictionsForDisplay(
                species.jurisdictions,
              );
              const { national, prefecture, municipality } =
                groupJurisdictionsByType(visibleJurisdictions);
              return (
                <div
                  key={index}
                  className="species-card"
                  onClick={() => openModal(species)}
                >
                  <h3>
                    {species.species_name}
                    {species.species_aliases.length > 0 && (
                      <span
                        style={{
                          fontSize: "0.7em",
                          color: "var(--text-faint)",
                          fontWeight: "normal",
                          marginLeft: "8px",
                        }}
                      >
                        （別名: {species.species_aliases.join(", ")}）
                      </span>
                    )}
                    {species.jurisdictions.some(
                      (j) => j.jurisdiction_type === "national",
                    ) && (
                      <span className="scientific">
                        {" "}
                        {species.scientific_name}{" "}
                      </span>
                    )}
                  </h3>

                  {/* 国 */}
                  {national.length > 0 && (
                    <div style={{ marginBottom: "8px" }}>
                      <div
                        style={{
                          fontSize: "0.85em",
                          color: "var(--text-body)",
                          marginBottom: "4px",
                        }}
                      >
                        🏛️ 国
                      </div>
                      <div className="prefecture-badges">
                        {national.map((j: Jurisdiction, i: number) => (
                          <span
                            key={i}
                            className={`category ${getCategoryClass(j.category_unified)}`}
                          >
                            {j.jurisdiction_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 都道府県 */}
                  {prefecture.length > 0 && (
                    <div style={{ marginBottom: "8px" }}>
                      <div
                        style={{
                          fontSize: "0.85em",
                          color: "var(--text-body)",
                          marginBottom: "4px",
                        }}
                      >
                        🗾 都道府県
                      </div>
                      <div className="prefecture-badges">
                        {prefecture.map((j: Jurisdiction, i: number) => (
                          <span
                            key={i}
                            className={`category ${getCategoryClass(j.category_unified)}`}
                          >
                            {j.jurisdiction_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 市町村 */}
                  {municipality.length > 0 && (
                    <div style={{ marginBottom: "8px" }}>
                      <div
                        style={{
                          fontSize: "0.85em",
                          color: "var(--text-body)",
                          marginBottom: "4px",
                        }}
                      >
                        🏘️ 市町村
                      </div>
                      <div className="prefecture-badges">
                        {municipality.map((j: Jurisdiction, i: number) => (
                          <span
                            key={i}
                            className={`category ${getCategoryClass(j.category_unified)}`}
                          >
                            {j.jurisdiction_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="meta-info">
                    <span className="meta-item">🔬 {species.taxonomy}</span>
                    <span className="meta-item">
                      📍 計{visibleJurisdictions.length}箇所で指定
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* モーダル */}
      {selectedSpecies &&
        (() => {
          // フィルター条件に合致する自治体のみ表示
          const visibleJurisdictions = filterJurisdictionsForDisplay(
            selectedSpecies.jurisdictions,
          );
          const { national, prefecture, municipality } =
            groupJurisdictionsByType(visibleJurisdictions);
          return (
            <div className="modal-overlay" onClick={closeModal}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <button className="modal-close" onClick={closeModal}>
                  ×
                </button>
                {/* ★ヘッダー部分 */}
                <div className="modal-header-info">
                  <h2>
                    {selectedSpecies.species_name}
                    {selectedSpecies.species_aliases.length > 0 && (
                      <span className="species-aliases">
                        （別名: {selectedSpecies.species_aliases.join(", ")}）
                      </span>
                    )}
                  </h2>
                  <p className="scientific">
                    {selectedSpecies.scientific_name}
                  </p>
                  <p className="taxonomy-label">{selectedSpecies.taxonomy}</p>
                  {(() => {
                    const nat = selectedSpecies.jurisdictions.find(
                      (j) => j.jurisdiction_type === "national",
                    );
                    return nat ? (
                      <div className="national-status">
                        <span className="national-status-label">環境省</span>
                        <span
                          className={`category ${getCategoryClass(nat.category_unified)}`}
                        >
                          {CATEGORY_LABEL[nat.category_unified] ??
                            nat.category_unified}
                        </span>
                        <span className="national-status-original">
                          （{nat.category}）
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* ★コンテンツ部分（スクロール可能） */}
                <div className="modal-body">
                  {/* 地図表示（都道府県データがある場合のみ） */}
                  {prefecture.length > 0 && (
                    <SpeciesMap jurisdictions={prefecture} />
                  )}
                  {/* 都道府県 */}
                  {prefecture.length > 0 && (
                    <>
                      <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>
                        🗾 都道府県
                      </h4>
                      <div className="prefecture-table-wrapper">
                        <table className="prefecture-table">
                          <thead>
                            <tr>
                              <th>機関</th>
                              <th>和名</th>
                              <th>学名</th>
                              <th>統一カテゴリ</th>
                              <th>出典カテゴリ</th>
                              <th>発行年</th>
                            </tr>
                          </thead>
                          <tbody>
                            {prefecture.map((j: Jurisdiction, i: number) => (
                              <tr key={i}>
                                <td>{j.jurisdiction_name}</td>
                                <td>{j.original_name}</td>
                                <td className="scientific-cell">
                                  {j.scientific_name || "—"}
                                </td>
                                <td>
                                  <span
                                    className={`category ${getCategoryClass(j.category_unified)}`}
                                  >
                                    {CATEGORY_LABEL[j.category_unified] ??
                                      j.category_unified}
                                  </span>
                                </td>
                                <td>{j.category}</td>
                                <td>{j.publication_year ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  {/* 市町村 */}
                  {municipality.length > 0 && (
                    <>
                      <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>
                        🏘️ 市町村
                      </h4>
                      <div className="prefecture-table-wrapper">
                        <table className="prefecture-table">
                          <thead>
                            <tr>
                              <th>機関</th>
                              <th>和名</th>
                              <th>学名</th>
                              <th>統一カテゴリ</th>
                              <th>出典カテゴリ</th>
                              <th>発行年</th>
                            </tr>
                          </thead>
                          <tbody>
                            {municipality.map((j: Jurisdiction, i: number) => (
                              <tr key={i}>
                                <td>{j.jurisdiction_name}</td>
                                <td>{j.original_name}</td>
                                <td className="scientific-cell">
                                  {j.scientific_name || "—"}
                                </td>
                                <td>
                                  <span
                                    className={`category ${getCategoryClass(j.category_unified)}`}
                                  >
                                    {CATEGORY_LABEL[j.category_unified] ??
                                      j.category_unified}
                                  </span>
                                </td>
                                <td>{j.category}</td>
                                <td>{j.publication_year ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="loading">読み込み中...</div>}>
      <SearchPage />
    </Suspense>
  );
}
