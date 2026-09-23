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

// 都道府県パネル用の地域グルーピング（標準的な8地方区分）
const PREFECTURE_REGIONS: { name: string; prefs: string[] }[] = [
  {
    name: "北海道・東北",
    prefs: [
      "北海道",
      "青森県",
      "岩手県",
      "宮城県",
      "秋田県",
      "山形県",
      "福島県",
    ],
  },
  {
    name: "関東",
    prefs: [
      "茨城県",
      "栃木県",
      "群馬県",
      "埼玉県",
      "千葉県",
      "東京都",
      "神奈川県",
    ],
  },
  {
    name: "中部",
    prefs: [
      "新潟県",
      "富山県",
      "石川県",
      "福井県",
      "山梨県",
      "長野県",
      "岐阜県",
      "静岡県",
      "愛知県",
    ],
  },
  {
    name: "近畿",
    prefs: [
      "三重県",
      "滋賀県",
      "京都府",
      "大阪府",
      "兵庫県",
      "奈良県",
      "和歌山県",
    ],
  },
  { name: "中国", prefs: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"] },
  { name: "四国", prefs: ["徳島県", "香川県", "愛媛県", "高知県"] },
  {
    name: "九州・沖縄",
    prefs: [
      "福岡県",
      "佐賀県",
      "長崎県",
      "熊本県",
      "大分県",
      "宮崎県",
      "鹿児島県",
      "沖縄県",
    ],
  },
];

// 分類群パネル用の動物／植物・菌類グルーピング
const TAXONOMY_GROUPS: { name: string; taxa: string[] }[] = [
  {
    name: "動物",
    taxa: [
      "哺乳類",
      "鳥類",
      "爬虫類",
      "両生類",
      "淡水魚類",
      "昆虫類",
      "甲殻類",
      "軟体動物",
      "その他無脊椎動物",
    ],
  },
  {
    name: "植物・菌類等",
    taxa: ["維管束植物", "蘚苔類", "藻類", "地衣類", "菌類"],
  },
];

type FilterTab = "category" | "prefecture" | "taxonomy" | null;

export default function Home() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([
    ...ALL_CATEGORIES,
  ]);
  const [prefectureFilters, setPrefectureFilters] = useState<string[]>([]);
  const [taxonomyFilters, setTaxonomyFilters] = useState<string[]>([]);

  // 絞り込み条件パネル（カテゴリ／都道府県／分類群）はセグメントコントロール風の
  // タブで切り替え、同時に開けるのは1つだけ
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>(null);
  const filterGroupRef = useRef<HTMLDivElement>(null);

  // 絞り込み条件（カテゴリ・都道府県・分類群）はデフォルトで非表示にし、
  // テキスト検索をメインの導線にする
  const [showFilters, setShowFilters] = useState(false);

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

  const activeFilterCount =
    (isCatFiltered ? 1 : 0) +
    (isPrefFiltered || hasMuniSelected ? 1 : 0) +
    (isTaxFiltered ? 1 : 0);

  // 都道府県パネル：地方区分ごとに、実際にデータのある都道府県・市町村だけをまとめる
  const regionGroups = PREFECTURE_REGIONS.map((region) => {
    const prefs = region.prefs.filter((p) => availablePrefectures.includes(p));
    const munis = prefs.flatMap((p) => prefToMunicipalities[p] ?? []);
    return { name: region.name, prefs, munis };
  }).filter((g) => g.prefs.length > 0);

  // 分類群パネル：動物／植物・菌類等ごとに、実際にデータのある分類群だけをまとめる
  const taxonomyGroups = TAXONOMY_GROUPS.map((group) => ({
    name: group.name,
    taxa: group.taxa.filter((t) => availableTaxonomies.includes(t)),
  })).filter((g) => g.taxa.length > 0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        filterGroupRef.current &&
        !filterGroupRef.current.contains(e.target as Node)
      )
        setActiveFilterTab(null);
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

  function toggleFilterTab(tab: Exclude<FilterTab, null>) {
    setActiveFilterTab((prev) => (prev === tab ? null : tab));
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
        paddingTop: showFilters ? "20px" : undefined,
        paddingBottom: showFilters ? "20px" : undefined,
      }}
    >
      <div style={{ width: "100%", maxWidth: "600px" }}>
        <header
          style={{
            textAlign: "center",
            marginBottom: showFilters ? "14px" : "30px",
          }}
        >
          <h1 style={{ fontSize: showFilters ? "1.8rem" : undefined }}>
            🌿 絶滅危惧種横断検索
          </h1>
          <p
            className="subtitle"
            style={{ marginTop: showFilters ? "10px" : undefined }}
          >
            日本の絶滅危惧種を検索・閲覧できます
            <br />
            全国のレッドリストをまとめて検索
            <br />
            <a href="/sources">📚 対応データ一覧</a>
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
              autoFocus
              style={{
                marginBottom: showFilters ? "8px" : "12px",
                padding: "16px 18px",
                fontSize: "var(--fs-lg, 1.15rem)",
                borderRadius: "10px",
              }}
            />

            <button
              type="submit"
              className="btn-primary"
              style={{
                width: "100%",
                padding: showFilters ? "12px" : "15px",
                border: "none",
                borderRadius: "8px",
                fontSize: "var(--fs-base)",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              検索する
            </button>

            {/* 絞り込み条件（カテゴリ・都道府県・分類群）はデフォルトで折りたたみ */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                width: "100%",
                padding: showFilters ? "8px" : "12px 8px",
                marginTop: showFilters ? "8px" : "14px",
                background: "none",
                border: "none",
                color: "var(--text-faint)",
                fontSize: "var(--fs-sm)",
                cursor: "pointer",
              }}
            >
              <span>
                絞り込み条件（カテゴリ・都道府県・分類群）
                {activeFilterCount > 0 && (
                  <span className="filter-badge" style={{ marginLeft: "6px" }}>
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <span className="dropdown-arrow">{showFilters ? "▲" : "▼"}</span>
            </button>

            {showFilters && (
              <>
                <div
                  className="home-segmented-wrap"
                  style={{ marginTop: "8px" }}
                  ref={filterGroupRef}
                >
                  <div className="home-segmented">
                    <button
                      type="button"
                      className={`home-segment-btn${activeFilterTab === "category" ? " home-segment-btn--active" : ""}`}
                      onClick={() => toggleFilterTab("category")}
                    >
                      <span>カテゴリ</span>
                      {isCatFiltered && (
                        <span className="filter-badge">
                          {categoryFilters.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`home-segment-btn${activeFilterTab === "prefecture" ? " home-segment-btn--active" : ""}`}
                      onClick={() => toggleFilterTab("prefecture")}
                    >
                      <span>都道府県</span>
                      {(isPrefFiltered || hasMuniSelected) && (
                        <span className="filter-badge">
                          {prefOnlyFilters.length + activeMuniTags.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`home-segment-btn${activeFilterTab === "taxonomy" ? " home-segment-btn--active" : ""}`}
                      onClick={() => toggleFilterTab("taxonomy")}
                    >
                      <span>分類群</span>
                      {isTaxFiltered && (
                        <span className="filter-badge">
                          {taxonomyFilters.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* カテゴリ複数選択 */}
                  {activeFilterTab === "category" && (
                    <div className="home-filter-panel home-filter-panel--wide">
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
                      <div className="home-option-row">
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
                        <div
                          className="home-cren-group"
                          title="CR・EN を個別に選択することもできます"
                        >
                          <label className="multi-select-option">
                            <input
                              type="checkbox"
                              checked={categoryFilters.includes("CREN")}
                              onChange={() => toggleCategory("CREN")}
                            />
                            絶滅危惧Ⅰ類（CR+EN）
                          </label>
                          <span className="home-cren-sub">
                            <label className="multi-select-option home-suboption">
                              <input
                                type="checkbox"
                                checked={categoryFilters.includes("CR")}
                                onChange={() => toggleCategory("CR")}
                              />
                              CR
                            </label>
                            <label className="multi-select-option home-suboption">
                              <input
                                type="checkbox"
                                checked={categoryFilters.includes("EN")}
                                onChange={() => toggleCategory("EN")}
                              />
                              EN
                            </label>
                          </span>
                        </div>
                        {(["VU", "NT", "DD", "LP", "OTHER"] as const).map(
                          (key) => (
                            <label key={key} className="multi-select-option">
                              <input
                                type="checkbox"
                                checked={categoryFilters.includes(key)}
                                onChange={() => toggleCategory(key)}
                              />
                              {CATEGORY_DISPLAY[key]}
                            </label>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {/* 都道府県＋市町村 複数選択（地方区分ごとにまとめて横並び） */}
                  {activeFilterTab === "prefecture" && (
                    <div className="home-filter-panel home-filter-panel--wide">
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
                      <label
                        className="multi-select-option"
                        style={{ marginBottom: "6px" }}
                      >
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
                      {regionGroups.map((region) => (
                        <div key={region.name} className="home-region">
                          <div className="home-region-row">
                            <span className="home-region-title">
                              {region.name}
                            </span>
                            {region.prefs.map((pref) => (
                              <label key={pref} className="home-pref-item">
                                <input
                                  type="checkbox"
                                  checked={prefectureFilters.includes(pref)}
                                  onChange={() => togglePrefecture(pref)}
                                />
                                {pref}
                              </label>
                            ))}
                            {region.munis.map((muni) => (
                              <label
                                key={muni}
                                className="home-pref-item home-pref-item--muni"
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
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 分類群 複数選択（動物／植物・菌類等で分けて表示） */}
                  {activeFilterTab === "taxonomy" && (
                    <div className="home-filter-panel home-filter-panel--wide">
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
                      {taxonomyGroups.map((group) => (
                        <div key={group.name} className="home-taxon-group">
                          <div className="home-taxon-group-title">
                            {group.name}
                          </div>
                          <div className="home-taxon-row">
                            {group.taxa.map((tax) => (
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
                        </div>
                      ))}
                    </div>
                  )}
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
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
