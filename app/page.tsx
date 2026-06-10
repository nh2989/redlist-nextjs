"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PREFECTURE_CODES,
  ALL_CATEGORIES,
  CATEGORY_DISPLAY,
  isAllCategoriesSelected,
  toggleCategoryValue,
  TAXONOMY_EMOJI,
} from "@/lib/categoryConstants";


interface SourceEntry {
  jurisdiction_name: string;
  jurisdiction_type: string;
  parent_prefecture?: string;
}

export default function Home() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([
    ...ALL_CATEGORIES,
  ]);
  const [prefectureFilters, setPrefectureFilters] = useState<string[]>([]);
  const [taxonomyFilters, setTaxonomyFilters] = useState<string[]>([]);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isPrefectureOpen, setIsPrefectureOpen] = useState(false);
  const [isTaxonomyOpen, setIsTaxonomyOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const prefectureRef = useRef<HTMLDivElement>(null);
  const taxonomyRef = useRef<HTMLDivElement>(null);

  const [availablePrefectures, setAvailablePrefectures] = useState<string[]>(
    [],
  );
  const [prefToMunicipalities, setPrefToMunicipalities] = useState<
    Record<string, string[]>
  >({});
  const [availableTaxonomies, setAvailableTaxonomies] = useState<string[]>([]);

  const availableAllPrefs = ["環境省", ...availablePrefectures];
  const allMunicipalities = Object.values(prefToMunicipalities).flat();

  const allCatSelected = isAllCategoriesSelected(categoryFilters);
  const isCatFiltered = !allCatSelected && categoryFilters.length > 0;

  const prefOnlyFilters = prefectureFilters.filter(
    (p) => !allMunicipalities.includes(p),
  );
  const allPrefSelected =
    availableAllPrefs.length > 1 &&
    availableAllPrefs.every((p) => prefOnlyFilters.includes(p));
  const isPrefFiltered = !allPrefSelected && prefOnlyFilters.length > 0;
  const hasMuniSelected = prefectureFilters.some((p) =>
    allMunicipalities.includes(p),
  );

  const allTaxSelected =
    availableTaxonomies.length > 0 &&
    availableTaxonomies.every((t) => taxonomyFilters.includes(t));
  const isTaxFiltered = !allTaxSelected && taxonomyFilters.length > 0;

  const activeCategoryTags = isCatFiltered
    ? categoryFilters.filter(
        (c) =>
          !(c === "CR" && categoryFilters.includes("CREN")) &&
          !(c === "EN" && categoryFilters.includes("CREN")),
      )
    : [];
  const activePrefTags = isPrefFiltered ? prefOnlyFilters : [];
  const activeMuniTags = prefectureFilters.filter((p) =>
    allMunicipalities.includes(p),
  );
  const activeTaxTags = isTaxFiltered ? taxonomyFilters : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(e.target as Node)
      )
        setIsCategoryOpen(false);
      if (
        prefectureRef.current &&
        !prefectureRef.current.contains(e.target as Node)
      )
        setIsPrefectureOpen(false);
      if (
        taxonomyRef.current &&
        !taxonomyRef.current.contains(e.target as Node)
      )
        setIsTaxonomyOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetch("/data/sources.json")
      .then((res) => res.json())
      .then((sources: SourceEntry[]) => {
        const prefs = sources
          .filter((s) => s.jurisdiction_type === "prefecture")
          .map((s) => s.jurisdiction_name)
          .sort(
            (a, b) =>
              (PREFECTURE_CODES[a] ?? 999) - (PREFECTURE_CODES[b] ?? 999),
          );
        setAvailablePrefectures(prefs);
        setPrefectureFilters(["環境省", ...prefs]);

        const muniMap: Record<string, string[]> = {};
        sources
          .filter(
            (s) =>
              s.jurisdiction_type === "municipality" && s.parent_prefecture,
          )
          .forEach((s) => {
            const parent = s.parent_prefecture!;
            if (!muniMap[parent]) muniMap[parent] = [];
            muniMap[parent].push(s.jurisdiction_name);
          });
        Object.keys(muniMap).forEach((p) => muniMap[p].sort());
        setPrefToMunicipalities(muniMap);
      })
      .catch(() => {});

    fetch("/data/taxonomies.json")
      .then((res) => res.json())
      .then((list: { canonical: string }[]) => {
        const taxes = list.map((t) => t.canonical);
        setAvailableTaxonomies(taxes);
        setTaxonomyFilters(taxes); // 初期値：全選択
      })
      .catch(() => {});
  }, []);

  function handleCategoryAllChange(checked: boolean) {
    setCategoryFilters(checked ? [...ALL_CATEGORIES] : []);
  }

  function toggleCategory(value: string) {
    setCategoryFilters((prev) => toggleCategoryValue(prev, value));
  }

  function handlePrefectureAllChange(checked: boolean) {
    setPrefectureFilters(checked ? [...availableAllPrefs] : []);
  }

  function togglePrefecture(value: string) {
    setPrefectureFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function toggleMunicipality(muni: string) {
    setPrefectureFilters((prev) =>
      prev.includes(muni) ? prev.filter((v) => v !== muni) : [...prev, muni],
    );
  }

  function handleTaxonomyAllChange(checked: boolean) {
    setTaxonomyFilters(checked ? [...availableTaxonomies] : []);
  }

  function toggleTaxonomy(tax: string) {
    setTaxonomyFilters((prev) =>
      prev.includes(tax) ? prev.filter((t) => t !== tax) : [...prev, tax],
    );
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    if (!allCatSelected)
      categoryFilters.forEach((cat) => params.append("category", cat));
    if (!allPrefSelected || hasMuniSelected)
      prefectureFilters.forEach((pref) => params.append("prefecture", pref));
    if (!allTaxSelected)
      taxonomyFilters.forEach((tax) => params.append("taxonomy", tax));
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div
      className="container"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "600px" }}>
        <header style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1>🌿 絶滅危惧種横断検索</h1>
          <p className="subtitle">
            日本の絶滅危惧種を検索・閲覧できます
            <br />
            全国のレッドリストをまとめて検索
            <br /><a href="/sources">📚 対応データ一覧</a>
          </p>
        </header>

        <form onSubmit={handleSearch}>
          <div className="search-section">
            <input
              type="text"
              id="searchBox"
              placeholder="種名・別名・学名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ marginBottom: "15px" }}
            />

            <div className="filters">
              {/* カテゴリ複数選択 */}
              <div className="multi-select-dropdown" ref={categoryRef}>
                <button
                  type="button"
                  className={`multi-select-btn${isCatFiltered ? " multi-select-btn--active" : ""}`}
                  onClick={() => setIsCategoryOpen((v) => !v)}
                >
                  <span>カテゴリ</span>
                  {isCatFiltered && (
                    <span className="filter-badge">
                      {categoryFilters.length}
                    </span>
                  )}
                  <span className="dropdown-arrow">
                    {isCategoryOpen ? "▲" : "▼"}
                  </span>
                </button>
                {isCategoryOpen && (
                  <div className="multi-select-options">
                    <label className="multi-select-option multi-select-option--all">
                      <input
                        type="checkbox"
                        checked={allCatSelected}
                        onChange={(e) =>
                          handleCategoryAllChange(e.target.checked)
                        }
                      />
                      すべて
                    </label>
                    <hr
                      style={{
                        margin: "4px 0",
                        border: "none",
                        borderTop: "1px solid var(--border)",
                      }}
                    />
                    <label className="multi-select-option">
                      <input
                        type="checkbox"
                        checked={categoryFilters.includes("EX")}
                        onChange={() => toggleCategory("EX")}
                      />
                      絶滅（EX）
                    </label>
                    <label className="multi-select-option">
                      <input
                        type="checkbox"
                        checked={categoryFilters.includes("EW")}
                        onChange={() => toggleCategory("EW")}
                      />
                      野生絶滅（EW）
                    </label>
                    <div className="pref-row-with-badge">
                      <label
                        className="multi-select-option"
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <input
                          type="checkbox"
                          checked={categoryFilters.includes("CREN")}
                          onChange={() => toggleCategory("CREN")}
                        />
                        絶滅危惧Ⅰ類（CR+EN）
                      </label>
                    </div>
                    <div className="muni-sub-list">
                      <div className="muni-sub-note">
                        CR・EN を個別に選択可能
                      </div>
                      <label className="multi-select-option muni-option">
                        <input
                          type="checkbox"
                          checked={categoryFilters.includes("CR")}
                          onChange={() => toggleCategory("CR")}
                        />
                        絶滅危惧ⅠA類（CR）
                      </label>
                      <label className="multi-select-option muni-option">
                        <input
                          type="checkbox"
                          checked={categoryFilters.includes("EN")}
                          onChange={() => toggleCategory("EN")}
                        />
                        絶滅危惧ⅠB類（EN）
                      </label>
                    </div>
                    {(["VU", "NT", "DD", "LP", "OTHER"] as const).map((key) => (
                      <label key={key} className="multi-select-option">
                        <input
                          type="checkbox"
                          checked={categoryFilters.includes(key)}
                          onChange={() => toggleCategory(key)}
                        />
                        {CATEGORY_DISPLAY[key]}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 都道府県＋市町村 複数選択 */}
              <div className="multi-select-dropdown" ref={prefectureRef}>
                <button
                  type="button"
                  className={`multi-select-btn${isPrefFiltered || hasMuniSelected ? " multi-select-btn--active" : ""}`}
                  onClick={() => setIsPrefectureOpen((v) => !v)}
                >
                  <span>都道府県</span>
                  {(isPrefFiltered || hasMuniSelected) && (
                    <span className="filter-badge">
                      {prefOnlyFilters.length + activeMuniTags.length}
                    </span>
                  )}
                  <span className="dropdown-arrow">
                    {isPrefectureOpen ? "▲" : "▼"}
                  </span>
                </button>
                {isPrefectureOpen && (
                  <div className="multi-select-options">
                    <label className="multi-select-option multi-select-option--all">
                      <input
                        type="checkbox"
                        checked={allPrefSelected}
                        onChange={(e) =>
                          handlePrefectureAllChange(e.target.checked)
                        }
                      />
                      すべて
                    </label>
                    <hr
                      style={{
                        margin: "4px 0",
                        border: "none",
                        borderTop: "1px solid var(--border)",
                      }}
                    />
                    <label className="multi-select-option">
                      <input
                        type="checkbox"
                        checked={prefectureFilters.includes("環境省")}
                        onChange={() => togglePrefecture("環境省")}
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
                    {availablePrefectures.map((pref) => {
                      const munis = prefToMunicipalities[pref] ?? [];
                      const hasMunis = munis.length > 0;
                      const prefChecked = prefectureFilters.includes(pref);
                      return (
                        <div key={pref}>
                          <div className="pref-row-with-badge">
                            <label
                              className="multi-select-option"
                              style={{ flex: 1, marginBottom: 0 }}
                            >
                              <input
                                type="checkbox"
                                checked={prefChecked}
                                onChange={() => togglePrefecture(pref)}
                              />
                              {pref}
                            </label>
                            {hasMunis && (
                              <span className="muni-exists-badge">
                                市町村あり
                              </span>
                            )}
                          </div>
                          {hasMunis && (
                            <div className="muni-sub-list">
                              <div className="muni-sub-note">
                                市町村データを追加する場合は選択
                              </div>
                              {munis.map((muni) => (
                                <label
                                  key={muni}
                                  className="multi-select-option muni-option"
                                >
                                  <input
                                    type="checkbox"
                                    checked={prefectureFilters.includes(muni)}
                                    onChange={() => toggleMunicipality(muni)}
                                  />
                                  {muni}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 分類群 複数選択 */}
              <div className="multi-select-dropdown" ref={taxonomyRef}>
                <button
                  type="button"
                  className={`multi-select-btn${isTaxFiltered ? " multi-select-btn--active" : ""}`}
                  onClick={() => setIsTaxonomyOpen((v) => !v)}
                >
                  <span>分類群</span>
                  {isTaxFiltered && (
                    <span className="filter-badge">{taxonomyFilters.length}</span>
                  )}
                  <span className="dropdown-arrow">
                    {isTaxonomyOpen ? "▲" : "▼"}
                  </span>
                </button>
                {isTaxonomyOpen && (
                  <div className="multi-select-options">
                    <label className="multi-select-option multi-select-option--all">
                      <input
                        type="checkbox"
                        checked={allTaxSelected}
                        onChange={(e) =>
                          handleTaxonomyAllChange(e.target.checked)
                        }
                      />
                      すべて
                    </label>
                    <hr
                      style={{
                        margin: "4px 0",
                        border: "none",
                        borderTop: "1px solid var(--border)",
                      }}
                    />
                    {availableTaxonomies.map((tax) => (
                      <label key={tax} className="multi-select-option">
                        <input
                          type="checkbox"
                          checked={taxonomyFilters.includes(tax)}
                          onChange={() => toggleTaxonomy(tax)}
                        />
                        {TAXONOMY_EMOJI[tax] ?? "🔹"} {tax}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* アクティブフィルタータグ */}
            {(activeCategoryTags.length > 0 ||
              activePrefTags.length > 0 ||
              activeMuniTags.length > 0 ||
              activeTaxTags.length > 0) && (
              <div className="active-filter-tags">
                {activeCategoryTags.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className="active-tag active-tag--cat"
                    onClick={() => toggleCategory(cat)}
                  >
                    {CATEGORY_DISPLAY[cat] ?? cat} ✕
                  </button>
                ))}
                {activePrefTags.map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    className="active-tag active-tag--pref"
                    onClick={() => togglePrefecture(pref)}
                  >
                    {pref} ✕
                  </button>
                ))}
                {activeMuniTags.map((muni) => (
                  <button
                    key={muni}
                    type="button"
                    className="active-tag active-tag--muni"
                    onClick={() => toggleMunicipality(muni)}
                  >
                    {muni} ✕
                  </button>
                ))}
                {activeTaxTags.map((tax) => (
                  <button
                    key={tax}
                    type="button"
                    className="active-tag active-tag--tax"
                    onClick={() => toggleTaxonomy(tax)}
                  >
                    {TAXONOMY_EMOJI[tax] ?? "🔹"} {tax} ✕
                  </button>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{
                width: "100%",
                padding: "15px",
                marginTop: "20px",
                border: "none",
                borderRadius: "8px",
                fontSize: "var(--fs-base)",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              検索する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}