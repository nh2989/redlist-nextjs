"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PREFECTURE_CODES } from "@/lib/categoryConstants";

const CATEGORIES: [string, string][] = [
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
];

export default function Home() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [prefectureFilters, setPrefectureFilters] = useState<string[]>([]);
  const [taxonomyFilter, setTaxonomyFilter] = useState("");

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isPrefectureOpen, setIsPrefectureOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const prefectureRef = useRef<HTMLDivElement>(null);

  const [availablePrefectures, setAvailablePrefectures] = useState<string[]>(
    [],
  );
  const [availableTaxonomies, setAvailableTaxonomies] = useState<string[]>([]);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(e.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
      if (
        prefectureRef.current &&
        !prefectureRef.current.contains(e.target as Node)
      ) {
        setIsPrefectureOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetch("/data/sources.json")
      .then((res) => res.json())
      .then(
        (
          sources: { jurisdiction_name: string; jurisdiction_type: string }[],
        ) => {
          const prefs = sources
            .filter((s) => s.jurisdiction_type === "prefecture")
            .map((s) => s.jurisdiction_name)
            .sort(
              (a, b) =>
                (PREFECTURE_CODES[a] ?? 999) - (PREFECTURE_CODES[b] ?? 999),
            );
          setAvailablePrefectures(prefs);
        },
      )
      .catch(() => {});

    // 追加: taxonomies.json fetch
    fetch("/data/taxonomies.json")
      .then((res) => res.json())
      .then((list: { canonical: string }[]) => {
        setAvailableTaxonomies(list.map((t) => t.canonical));
      })
      .catch(() => {});
  }, []);

  function toggleCategory(value: string) {
    setCategoryFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function togglePrefecture(value: string) {
    setPrefectureFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    categoryFilters.forEach((cat) => params.append("category", cat));
    prefectureFilters.forEach((pref) => params.append("prefecture", pref));
    if (taxonomyFilter) params.set("taxonomy", taxonomyFilter);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div
      className="container"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "600px" }}>
        <header style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "10px" }}>
            🌿 絶滅危惧種検索サイト
          </h1>
          <p className="subtitle">日本の絶滅危惧種を検索・閲覧できます</p>
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
                    {CATEGORIES.map(([value, label]) => (
                      <label key={value} className="multi-select-option">
                        <input
                          type="checkbox"
                          checked={categoryFilters.includes(value)}
                          onChange={() => toggleCategory(value)}
                        />
                        {label}
                      </label>
                    ))}
                    {categoryFilters.length > 0 && (
                      <button
                        type="button"
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
              <div className="multi-select-dropdown" ref={prefectureRef}>
                <button
                  type="button"
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

                    {availablePrefectures.map((pref) => (
                      <label key={pref} className="multi-select-option">
                        <input
                          type="checkbox"
                          checked={prefectureFilters.includes(pref)}
                          onChange={() => togglePrefecture(pref)}
                        />
                        {pref}
                      </label>
                    ))}

                    {prefectureFilters.length > 0 && (
                      <button
                        type="button"
                        className="multi-select-clear"
                        onClick={() => setPrefectureFilters([])}
                      >
                        クリア
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 分類群 */}
              <select
                value={taxonomyFilter}
                onChange={(e) => setTaxonomyFilter(e.target.value)}
              >
                <option value="">分類群：すべて</option>
                {availableTaxonomies.map((tax) => (
                  <option key={tax} value={tax}>
                    {tax}
                  </option>
                ))}
              </select>
            </div>

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

        <div
          style={{
            textAlign: "center",
            marginTop: "40px",
            color: "var(--text-body)",
            fontSize: "var(--fs-sm)",
          }}
        >
          <p>📕 国のレッドリスト対応</p>
          <p>🗾 対応都道府県：{availablePrefectures.join("、")}</p>
          <p>🏘️ 市町村レッドリストも一部対応</p>
        </div>
      </div>
    </div>
  );
}
