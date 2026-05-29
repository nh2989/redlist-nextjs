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
  isSameCategory,
  getTaxonomyDotColor, // 追加
} from "@/lib/categoryConstants";

import type {
  RawSpeciesRecord,
  Jurisdiction,
  SpeciesGroup,
  SourceRecord,
} from "@/lib/types";

// 種の最も高い希少性カテゴリを取得
function getHighestPriorityCategory(jurisdictions: Jurisdiction[]): number {
  const typeOrder = ["national", "prefecture", "municipality"] as const;
  for (const type of typeOrder) {
    const filtered = jurisdictions.filter((j) => j.jurisdiction_type === type);
    if (filtered.length > 0) {
      return Math.min(
        ...filtered.map((j) => CATEGORY_PRIORITY[j.category_unified] ?? 999),
      );
    }
  }
  return 999;
}

// 別名を正規化
function normalizeAliases(
  aliases: string | string[] | null | undefined,
): string[] {
  if (!aliases || aliases === "") return [];
  if (Array.isArray(aliases)) return aliases.filter((a) => a?.trim() !== "");
  return aliases
    .split("|")
    .map((a) => a.trim())
    .filter((a) => a !== "");
}

function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearchTerm = searchParams.get("q") || "";
  const initialCategories = searchParams.getAll("category");
  const initialPrefectures = searchParams.getAll("prefecture");
  const initialMunicipality = searchParams.get("municipality") || "";
  const initialTaxonomy = searchParams.get("taxonomy") || "";
  const initialSort = searchParams.get("sort") || "name";

  const [allSpeciesData, setAllSpeciesData] = useState<RawSpeciesRecord[]>([]);
  const [groupedData, setGroupedData] = useState<SpeciesGroup[]>([]);
  const [filteredData, setFilteredData] = useState<SpeciesGroup[]>([]);
  const [displayData, setDisplayData] = useState<SpeciesGroup[]>([]);

  const [categoryFilters, setCategoryFilters] =
    useState<string[]>(initialCategories);
  const [prefectureFilters, setPrefectureFilters] =
    useState<string[]>(initialPrefectures);

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
  const [taxonomyList, setTaxonomyList] = useState<
    { canonical: string; aliases: string[] }[]
  >([]);
  const [availableMunicipalities, setAvailableMunicipalities] = useState<
    string[]
  >([]);
  const [includeMunicipalities, setIncludeMunicipalities] = useState(true);

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

  useEffect(() => {
    loadData();
  }, []);

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

      const [sourcesRes, synonymsRes, taxonomiesRes, ...dataResponses] =
        await Promise.all([
          fetch("/data/sources.json"),
          fetch("/data/synonyms.json").catch(() => null),
          fetch("/data/taxonomies.json").catch(() => null),
          ...dataFiles.map((f) => fetch(f.path).catch(() => null)),
        ]);

      const synonyms: Record<string, string> = synonymsRes
        ? await synonymsRes.json().catch(() => ({}))
        : {};

      const taxonomyListData: { canonical: string; aliases: string[] }[] =
        taxonomiesRes ? await taxonomiesRes.json().catch(() => []) : [];
      const taxonomyMap: Record<string, string> = {};
      for (const entry of taxonomyListData) {
        for (const alias of entry.aliases) taxonomyMap[alias] = entry.canonical;
      }
      setTaxonomyList(taxonomyListData);

      const sources: SourceRecord[] = await sourcesRes.json().catch(() => []);
      const srcMap = Object.fromEntries(sources.map((s) => [s.id, s]));
      setSourceMap(srcMap);

      const dataArrays = await Promise.all(
        dataResponses.map((res) =>
          res ? res.json().catch(() => []) : Promise.resolve([]),
        ),
      );

      const allData: RawSpeciesRecord[] = dataFiles.flatMap((file, i) => {
        const items: RawSpeciesRecord[] = dataArrays[i] ?? [];
        return items.map((item) => ({
          ...item,
          taxonomy: taxonomyMap[item.taxonomy] ?? item.taxonomy,
          source_id: file.id,
          species_aliases: normalizeAliases(item.species_aliases),
          publication_year: srcMap[file.id]?.publication_year ?? null,
        }));
      });

      setAllSpeciesData(allData);

      // 確認のために一時的に
      console.log("分類群一覧:", [...new Set(allData.map(d => d.taxonomy))].sort());

      setGroupedData(groupBySpecies(allData, synonyms));
    } catch (error) {
      console.error("データ読み込みエラー:", error);
    } finally {
      setLoading(false);
    }
  }

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

    Object.values(speciesMap).forEach((species: SpeciesGroup) => {
      species.jurisdictions.sort((a: Jurisdiction, b: Jurisdiction) => {
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
        return (
          (PREFECTURE_CODES[a.jurisdiction_name] || 999) -
          (PREFECTURE_CODES[b.jurisdiction_name] || 999)
        );
      });
    });

    return Object.values(speciesMap);
  }

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

  useEffect(() => {
    filterResults();
  }, [
    categoryFilters,
    prefectureFilters,
    municipalityFilter,
    taxonomyFilter,
    includeMunicipalities,
    groupedData,
  ]);

  function filterResults() {
    let filtered = groupedData;

    if (initialSearchTerm) {
      const searchLower = initialSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (species) =>
          species.species_name.toLowerCase().includes(searchLower) ||
          species.species_aliases.some((alias: string) =>
            alias.toLowerCase().includes(searchLower),
          ) ||
          species.scientific_name.toLowerCase().includes(searchLower),
      );
    }

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

    if (taxonomyFilter) {
      filtered = filtered.filter(
        (species) => species.taxonomy === taxonomyFilter,
      );
    }

    setFilteredData(filtered);
  }

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

  useEffect(() => {
    sortResults();
  }, [filteredData, sortOrder]);

  function sortResults() {
    let sorted = [...filteredData];

    // taxonomyList の順序でインデックスマップを作成
    const taxonomyOrder: Record<string, number> = {};
    taxonomyList.forEach((t, i) => {
      taxonomyOrder[t.canonical] = i;
    });
    const getTaxOrder = (tax: string) => taxonomyOrder[tax] ?? 999;

    if (sortOrder === "name") {
      sorted.sort((a, b) => {
        const taxCompare = getTaxOrder(a.taxonomy) - getTaxOrder(b.taxonomy);
        if (taxCompare !== 0) return taxCompare;
        return a.species_name.localeCompare(b.species_name, "ja");
      });
    } else if (sortOrder === "jurisdiction-desc") {
      sorted.sort(
        (a, b) =>
          filterJurisdictionsForDisplay(b.jurisdictions).length -
          filterJurisdictionsForDisplay(a.jurisdictions).length,
      );
    } else if (sortOrder === "jurisdiction-asc") {
      sorted.sort(
        (a, b) =>
          filterJurisdictionsForDisplay(a.jurisdictions).length -
          filterJurisdictionsForDisplay(b.jurisdictions).length,
      );
    } else if (sortOrder === "scientific") {
      sorted.sort((a, b) => {
        const taxCompare = getTaxOrder(a.taxonomy) - getTaxOrder(b.taxonomy);
        if (taxCompare !== 0) return taxCompare;
        return a.scientific_name.localeCompare(b.scientific_name);
      });
    } else if (sortOrder === "category") {
      sorted.sort((a, b) => {
        const pa = getHighestPriorityCategory(
          filterJurisdictionsForDisplay(a.jurisdictions),
        );
        const pb = getHighestPriorityCategory(
          filterJurisdictionsForDisplay(b.jurisdictions),
        );
        if (pa !== pb) return pa - pb;
        const taxCompare = getTaxOrder(a.taxonomy) - getTaxOrder(b.taxonomy);
        if (taxCompare !== 0) return taxCompare;
        return a.species_name.localeCompare(b.species_name, "ja");
      });
    }

    setDisplayData(sorted);
  }

  function goToTop() {
    router.push("/");
  }
  function openModal(species: SpeciesGroup) {
    setSelectedSpecies(species);
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    setSelectedSpecies(null);
    document.body.style.overflow = "";
  }

  function filterJurisdictionsForDisplay(
    jurisdictions: Jurisdiction[],
  ): Jurisdiction[] {
    let filtered = jurisdictions;
    if (categoryFilters.length > 0) {
      filtered = filtered.filter((j) =>
        categoryFilters.some((cat) => isSameCategory(j.category_unified, cat)),
      );
    }
    if (prefectureFilters.length > 0) {
      filtered = filtered.filter(
        (j) =>
          prefectureFilters.includes(j.jurisdiction_name) ||
          (includeMunicipalities &&
            prefectureFilters.some((pref) => j.parent_prefecture === pref)),
      );
    }
    if (municipalityFilter) {
      filtered = filtered.filter(
        (j) => j.jurisdiction_name === municipalityFilter,
      );
    }
    return filtered;
  }

  function groupJurisdictionsByType(jurisdictions: Jurisdiction[]) {
    return {
      national: jurisdictions.filter((j) => j.jurisdiction_type === "national"),
      prefecture: jurisdictions.filter(
        (j) => j.jurisdiction_type === "prefecture",
      ),
      municipality: jurisdictions.filter(
        (j) => j.jurisdiction_type === "municipality",
      ),
    };
  }

  if (loading) return <div className="loading">読み込み中...</div>;

  // taxonomy の順序マップを使って一度にグループ化
  const taxonomyOrder: Record<string, number> = {};
  taxonomyList.forEach((t, i) => {
    taxonomyOrder[t.canonical] = i;
  });

  const taxonomyGroupMap = new Map<string, SpeciesGroup[]>();
  for (const species of displayData) {
    const existing = taxonomyGroupMap.get(species.taxonomy);
    if (existing) {
      existing.push(species);
    } else {
      taxonomyGroupMap.set(species.taxonomy, [species]);
    }
  }

  // taxonomyList の順序で並べ直す
  const taxonomyGroups = Array.from(taxonomyGroupMap.entries())
    .sort(([a], [b]) => (taxonomyOrder[a] ?? 999) - (taxonomyOrder[b] ?? 999))
    .map(([taxonomy, items]) => ({ taxonomy, items }));

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
          {initialSearchTerm && (
            <p className="search-query-label">
              「{initialSearchTerm}」の検索結果
            </p>
          )}
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

            {/* 都道府県複数選択 */}
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
              {taxonomyList
                .map((t) => t.canonical)
                .filter((tax) =>
                  allSpeciesData.some((item) => item.taxonomy === tax),
                )
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

        {/*===== 検索結果 =====*/}
        <div className="results">
          {displayData.length === 0 ? (
            <div className="no-results">該当する種が見つかりませんでした。</div>
          ) : (
            taxonomyGroups.map(({ taxonomy, items }) => (
              <div key={taxonomy}>
                {/* 分類群ヘッダー */}
                <div className="taxonomy-group-header">
                  <div
                    className="tax-dot"
                    style={{ background: getTaxonomyDotColor(taxonomy) }}
                  />
                  <span>{taxonomy}</span>
                </div>

                {/* グループ外枠 */}
                <div className="card-group">
                  {items.map((species, index) => {
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
                        {/* 左列：和名・学名 */}
                        <div className="card-left">
                          <h3>
                            {species.species_name}
                            {species.species_aliases.length > 0 && (
                              <span
                                style={{
                                  fontSize: "0.75em",
                                  color: "var(--text-faint)",
                                  fontWeight: "normal",
                                  marginLeft: "6px",
                                }}
                              >
                                （別名: {species.species_aliases.join(", ")}）
                              </span>
                            )}
                          </h3>
                          {species.jurisdictions.some(
                            (j) => j.jurisdiction_type === "national",
                          ) && (
                            <span className="scientific">
                              {species.scientific_name}
                            </span>
                          )}
                        </div>

                        {/* 右列：指定状況 */}
                        <div className="card-right">
                          {national.length > 0 && (
                            <div className="desg-row">
                              <span className="desg-label">国</span>
                              <div className="org-list">
                                {national.map((j: Jurisdiction, i: number) => (
                                  <span
                                    key={i}
                                    className={`org-item ${getCategoryClass(j.category_unified)}`}
                                  >
                                    {j.jurisdiction_name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {prefecture.length > 0 && (
                            <div className="desg-row">
                              <span className="desg-label">都道府県</span>
                              <div className="org-list">
                                {prefecture.map(
                                  (j: Jurisdiction, i: number) => (
                                    <span
                                      key={i}
                                      className={`org-item ${getCategoryClass(j.category_unified)}`}
                                    >
                                      {j.jurisdiction_name}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                          {municipality.length > 0 && (
                            <div className="desg-row">
                              <span className="desg-label">市町村</span>
                              <div className="org-list">
                                {municipality.map(
                                  (j: Jurisdiction, i: number) => (
                                    <span
                                      key={i}
                                      className={`org-item ${getCategoryClass(j.category_unified)}`}
                                    >
                                      {j.jurisdiction_name}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* モーダル（変更なし） */}
      {selectedSpecies &&
        (() => {
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
                <div className="modal-body">
                  {prefecture.length > 0 && (
                    <SpeciesMap jurisdictions={prefecture} />
                  )}
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
