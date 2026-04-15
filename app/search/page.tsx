"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import dynamic from "next/dynamic";
const SpeciesMap = dynamic(() => import("../components/SpeciesMap"), {
  ssr: false,
});

import {
  CATEGORY_PRIORITY,
  PREFECTURE_CODES,
  getCategoryClass,
  isMajorCategory,
  isSameCategory,
} from "@/lib/categoryConstants";

import type { RawSpeciesRecord, Jurisdiction, SpeciesGroup } from "@/lib/types";

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
  const initialCategory = searchParams.get("category") || "";
  const initialPrefecture = searchParams.get("prefecture") || "";
  const initialMunicipality = searchParams.get("municipality") || "";
  const initialTaxonomy = searchParams.get("taxonomy") || "";
  const initialSort = searchParams.get("sort") || "name";

  // State（状態管理）
  const [allSpeciesData, setAllSpeciesData] = useState<RawSpeciesRecord[]>([]);
  const [groupedData, setGroupedData] = useState<SpeciesGroup[]>([]);
  const [filteredData, setFilteredData] = useState<SpeciesGroup[]>([]);
  const [displayData, setDisplayData] = useState<SpeciesGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [prefectureFilter, setPrefectureFilter] = useState(initialPrefecture);
  const [municipalityFilter, setMunicipalityFilter] =
    useState(initialMunicipality);
  const [taxonomyFilter, setTaxonomyFilter] = useState(initialTaxonomy);
  const [sortOrder, setSortOrder] = useState(initialSort);
  const [loading, setLoading] = useState(true);
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesGroup | null>(
    null,
  );

  // 市町村リスト（選択された都道府県に応じて変化）
  const [availableMunicipalities, setAvailableMunicipalities] = useState<
    string[]
  >([]);

  // オートコンプリート用
  const [autocompleteItems, setAutocompleteItems] = useState<SpeciesGroup[]>(
    [],
  );
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // データ読み込み（初回のみ）
  useEffect(() => {
    loadData();
  }, []);

  // データ読み込み関数
  async function loadData() {
    setLoading(true);
    try {
      const dataFiles = [
        "/data/national.json",
        "/data/shiga.json",
        "/data/kyoto.json",
        "/data/aichi.json",
        "/data/hiroshima.json",
        "/data/koka.json",
        "/data/hikone.json",
        "/data/shimane.json",
        "/data/fukui.json",
        "/data/gifu.json",
        "/data/mie.json",
      ];

      const responses = await Promise.all(
        dataFiles.map((file) => fetch(file).catch(() => null)),
      );

      const dataArrays = await Promise.all(
        responses.map((response) =>
          response ? response.json().catch(() => []) : [],
        ),
      );

      // データを正規化
      const allData: RawSpeciesRecord[] = dataArrays
        .flat()
        .map((item: RawSpeciesRecord) => ({
          ...item,
          species_aliases: normalizeAliases(item.species_aliases),
        }));

      setAllSpeciesData(allData);

      // グループ化
      const grouped = groupBySpecies(allData);
      setGroupedData(grouped);
    } catch (error) {
      console.error("データ読み込みエラー:", error);
    } finally {
      setLoading(false);
    }
  }

  // グループ化関数（和名でグループ化）
  function groupBySpecies(data: RawSpeciesRecord[]): SpeciesGroup[] {
    const speciesMap: Record<string, SpeciesGroup> = {};

    data.forEach((item) => {
      const key = item.species_name;

      if (!speciesMap[key]) {
        speciesMap[key] = {
          species_name: item.species_name,
          species_aliases: (item.species_aliases as string[]) || [],
          scientific_name: item.scientific_name,
          taxonomy: item.taxonomy,
          jurisdictions: [],
        };
      }

      speciesMap[key].jurisdictions.push({
        jurisdiction_name: item.jurisdiction_name,
        jurisdiction_type: item.jurisdiction_type,
        parent_prefecture: item.parent_prefecture,
        category: item.category,
        category_unified: item.category_unified,
        scientific_name: item.scientific_name,
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
    if (prefectureFilter) {
      const municipalities = allSpeciesData
        .filter(
          (item) =>
            item.jurisdiction_type === "municipality" &&
            item.parent_prefecture === prefectureFilter,
        )
        .map((item) => item.jurisdiction_name);

      const uniqueMunicipalities = Array.from(new Set(municipalities)).sort();
      setAvailableMunicipalities(uniqueMunicipalities);
    } else {
      setAvailableMunicipalities([]);
      setMunicipalityFilter("");
    }
  }, [prefectureFilter, allSpeciesData]);

  // フィルタリング処理
  useEffect(() => {
    filterResults();
  }, [
    searchTerm,
    categoryFilter,
    prefectureFilter,
    municipalityFilter,
    taxonomyFilter,
    groupedData,
  ]);

  function filterResults() {
    let filtered = groupedData;

    // 検索テキスト（和名・別名・学名）
    if (searchTerm) {
      filtered = filtered.filter((species) => {
        const searchLower = searchTerm.toLowerCase();

        const matchName = species.species_name
          .toLowerCase()
          .includes(searchLower);
        const matchAlias =
          species.species_aliases.length > 0 &&
          species.species_aliases.some((alias: string) =>
            alias.toLowerCase().includes(searchLower),
          );
        const matchScientific = species.scientific_name
          .toLowerCase()
          .includes(searchLower);

        return matchName || matchAlias || matchScientific;
      });
    }

    // カテゴリ＋都道府県＋市町村の複合フィルター
    if (categoryFilter && prefectureFilter && municipalityFilter) {
      filtered = filtered.filter((species) =>
        species.jurisdictions.some(
          (j: Jurisdiction) =>
            j.jurisdiction_name === municipalityFilter &&
            isSameCategory(j.category_unified, categoryFilter),
        ),
      );
    }
    // カテゴリ＋都道府県
    else if (categoryFilter && prefectureFilter) {
      filtered = filtered.filter((species) =>
        species.jurisdictions.some(
          (j: Jurisdiction) =>
            j.jurisdiction_name === prefectureFilter &&
            isSameCategory(j.category_unified, categoryFilter),
        ),
      );
    }
    // カテゴリのみ
    else if (categoryFilter) {
      filtered = filtered.filter((species) =>
        species.jurisdictions.some((j: Jurisdiction) =>
          isSameCategory(j.category_unified, categoryFilter),
        ),
      );
    }
    // 都道府県＋市町村
    else if (prefectureFilter && municipalityFilter) {
      filtered = filtered.filter((species) =>
        species.jurisdictions.some(
          (j: Jurisdiction) => j.jurisdiction_name === municipalityFilter,
        ),
      );
    }
    // 都道府県のみ
    else if (prefectureFilter) {
      filtered = filtered.filter((species) =>
        species.jurisdictions.some(
          (j: Jurisdiction) => j.jurisdiction_name === prefectureFilter,
        ),
      );
    }

    // 分類フィルター
    if (taxonomyFilter) {
      filtered = filtered.filter(
        (species) => species.taxonomy === taxonomyFilter,
      );
    }

    setFilteredData(filtered);
  }

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

    // カテゴリフィルターが選択されている場合
    if (categoryFilter) {
      filtered = filtered.filter((j: Jurisdiction) =>
        isSameCategory(j.category_unified, categoryFilter),
      );
    }

    // 都道府県フィルターが選択されている場合
    if (prefectureFilter) {
      filtered = filtered.filter(
        (j: Jurisdiction) =>
          j.jurisdiction_name === prefectureFilter ||
          j.parent_prefecture === prefectureFilter,
      );
    }

    // 市町村フィルターが選択されている場合
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
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">カテゴリ：すべて</option>
              <option value="EX">絶滅（EX）</option>
              <option value="EW">野生絶滅（EW）</option>
              <option value="CR">絶滅危惧ⅠA類（CR）</option>
              <option value="EN">絶滅危惧ⅠB類（EN）</option>
              <option value="CREN">絶滅危惧Ⅰ類（CR+EN）</option>
              <option value="VU">絶滅危惧Ⅱ類（VU）</option>
              <option value="NT">準絶滅危惧（NT）</option>
              <option value="DD">情報不足（DD）</option>
              <option value="OTHER">その他重要種</option>
            </select>

            <select
              value={prefectureFilter}
              onChange={(e) => {
                setPrefectureFilter(e.target.value);
                setMunicipalityFilter("");
              }}
            >
              <option value="">都道府県：すべて</option>
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
                  <option key={pref} value={pref}>
                    {pref}
                  </option>
                ))}
            </select>

            {availableMunicipalities.length > 0 && (
              <select
                value={municipalityFilter}
                onChange={(e) => setMunicipalityFilter(e.target.value)}
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
                    <span className="scientific">
                      {" "}
                      {species.scientific_name}{" "}
                    </span>
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

        <footer>
          <p>データ出典：環境省・都道府県・市町村レッドリスト</p>
        </footer>
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
                </div>

                {/* ★コンテンツ部分（スクロール可能） */}
                <div className="modal-body">
                  {/* 地図表示（都道府県データがある場合のみ） */}
                  {prefecture.length > 0 && (
                    <SpeciesMap jurisdictions={prefecture} />
                  )}
                  <h3>指定状況</h3>
                  {/* 国 */}
                  {national.length > 0 && (
                    <>
                      <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>
                        🏛️ 国
                      </h4>
                      <table className="prefecture-table">
                        <thead>
                          <tr>
                            <th>機関</th>
                            <th>学名</th>
                            <th>カテゴリ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {national.map((j: Jurisdiction, i: number) => (
                            <tr key={i}>
                              <td>{j.jurisdiction_name}</td>
                              <td className="scientific-cell">
                                {j.scientific_name}
                              </td>
                              <td>
                                <span
                                  className={`category ${getCategoryClass(j.category_unified)}`}
                                >
                                  {j.category}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                  {/* 都道府県 */}
                  {prefecture.length > 0 && (
                    <>
                      <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>
                        🗾 都道府県
                      </h4>
                      <table className="prefecture-table">
                        <thead>
                          <tr>
                            <th>都道府県</th>
                            <th>学名</th>
                            <th>カテゴリ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prefecture.map((j: Jurisdiction, i: number) => (
                            <tr key={i}>
                              <td>{j.jurisdiction_name}</td>
                              <td className="scientific-cell">
                                {j.scientific_name}
                              </td>
                              <td>
                                <span
                                  className={`category ${getCategoryClass(j.category_unified)}`}
                                >
                                  {j.category}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                  {/* 市町村 */}
                  {municipality.length > 0 && (
                    <>
                      <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>
                        🏘️ 市町村
                      </h4>
                      <table className="prefecture-table">
                        <thead>
                          <tr>
                            <th>市町村</th>
                            <th>学名</th>
                            <th>カテゴリ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {municipality.map((j: Jurisdiction, i: number) => (
                            <tr key={i}>
                              <td>
                                {j.jurisdiction_name}
                                {j.parent_prefecture && (
                                  <span
                                    style={{
                                      fontSize: "0.85em",
                                      color: "var(--text-faint)",
                                      marginLeft: "4px",
                                    }}
                                  >
                                    （{j.parent_prefecture}）
                                  </span>
                                )}
                              </td>
                              <td className="scientific-cell">
                                {j.scientific_name}
                              </td>
                              <td>
                                <span
                                  className={`category ${getCategoryClass(j.category_unified)}`}
                                >
                                  {j.category}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
