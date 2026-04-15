"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [prefectureFilter, setPrefectureFilter] = useState("");
  const [municipalityFilter, setMunicipalityFilter] = useState("");
  const [taxonomyFilter, setTaxonomyFilter] = useState("");

  // 検索実行
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    // URLパラメータを構築
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    if (categoryFilter) params.set("category", categoryFilter);
    if (prefectureFilter) params.set("prefecture", prefectureFilter);
    if (municipalityFilter) params.set("municipality", municipalityFilter);
    if (taxonomyFilter) params.set("taxonomy", taxonomyFilter);

    // 検索結果ページに遷移
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
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">カテゴリ：すべて</option>
                <option value="EX">絶滅（EX）</option>
                <option value="EW">野生絶滅（EW）</option>{" "}
                <option value="CR">絶滅危惧ⅠA類（CR）</option>
                <option value="EN">絶滅危惧ⅠB類（EN）</option>
                <option value="CREN">絶滅危惧Ⅰ類（CR+EN）</option>
                <option value="VU">絶滅危惧Ⅱ類（VU）</option>
                <option value="NT">準絶滅危惧（NT）</option>
                <option value="DD">情報不足（DD）</option>
                <option value="OTHER">その他</option>
              </select>

              <select
                value={prefectureFilter}
                onChange={(e) => setPrefectureFilter(e.target.value)}
              >
                <option value="">都道府県：すべて</option>
                <option value="滋賀県">滋賀県</option>
                <option value="京都府">京都府</option>
                <option value="大阪府">大阪府</option>
                <option value="愛知県">愛知県</option>
                <option value="広島県">広島県</option>
                <option value="島根県">島根県</option>
                <option value="福井県">福井県</option>
                <option value="岐阜県">岐阜県</option>
                <option value="三重県">三重県</option>
              </select>

              <select
                value={taxonomyFilter}
                onChange={(e) => setTaxonomyFilter(e.target.value)}
              >
                <option value="">分類：すべて</option>
                <option value="維管束植物">維管束植物</option>
                <option value="動物">動物</option>
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
                transition: "transform 0.2s",
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
          <p>
            🗾
            対応都道府県：滋賀県、京都府、大阪府、愛知県、広島県、島根県、福井県、岐阜県、三重県
          </p>
          <p>🏘️ 市町村レッドリストも一部対応</p>
        </div>
      </div>

      <footer
        style={{
          position: "fixed",
          bottom: "20px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "var(--fs-xs)", opacity: 0.8 }}>
          データ出典：環境省・都道府県・市町村レッドリスト
        </p>
      </footer>
    </div>
  );
}
