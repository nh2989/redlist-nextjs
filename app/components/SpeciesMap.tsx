"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ========== コンポーネント外の定数・関数 ==========

const JAPAN_MAP_SVG = "/japan-map.svg";

// 都道府県コード → 都道府県名（Geoloniaのdata-codeと紐付け）
const CODE_TO_PREF: Record<number, string> = {
  1: "北海道", 2: "青森県", 3: "岩手県", 4: "宮城県", 5: "秋田県",
  6: "山形県", 7: "福島県", 8: "茨城県", 9: "栃木県", 10: "群馬県",
  11: "埼玉県", 12: "千葉県", 13: "東京都", 14: "神奈川県", 15: "新潟県",
  16: "富山県", 17: "石川県", 18: "福井県", 19: "山梨県", 20: "長野県",
  21: "岐阜県", 22: "静岡県", 23: "愛知県", 24: "三重県", 25: "滋賀県",
  26: "京都府", 27: "大阪府", 28: "兵庫県", 29: "奈良県", 30: "和歌山県",
  31: "鳥取県", 32: "島根県", 33: "岡山県", 34: "広島県", 35: "山口県",
  36: "徳島県", 37: "香川県", 38: "愛媛県", 39: "高知県", 40: "福岡県",
  41: "佐賀県", 42: "長崎県", 43: "熊本県", 44: "大分県", 45: "宮崎県",
  46: "鹿児島県", 47: "沖縄県",
};

const CATEGORY_PRIORITY: Record<string, number> = {
  絶滅: 1, EX: 1,
  野生絶滅: 2, EW: 2,
  CR: 3, 絶滅危惧Ⅰ類: 3,
  EN: 4,
  VU: 5, 絶滅危惧Ⅱ類: 5,
  NT: 6, 準絶滅危惧: 6,
  DD: 7, 情報不足: 7,
};

function getCategoryColor(category: string | null): string {
  if (!category) return "#ffffff";
  if (category.includes("絶滅") && !category.includes("危惧") && !category.includes("野生")) return "#000000";
  if (category.includes("野生絶滅") || category.includes("EW")) return "#542344";
  if (category.includes("CR") || category.includes("絶滅危惧Ⅰ類")) return "#d81e05";
  if (category.includes("EN")) return "#fc7f3f";
  if (category.includes("VU") || category.includes("絶滅危惧Ⅱ類")) return "#f9e814";
  if (category.includes("NT") || category.includes("準絶滅危惧")) return "#CCE226";
  if (category.includes("DD") || category.includes("情報不足")) return "#d1d1c6";
  return "#e5e5e5";
}

// SVGキャッシュ（モジュールレベル）
let svgCache: string | null = null;

// ========== 型定義 ==========

interface JurisdictionData {
  jurisdiction_name: string;
  category: string;
  category_unified: string;
}

interface SpeciesMapProps {
  jurisdictions: JurisdictionData[];
}

// ========== コンポーネント ==========

export default function SpeciesMap({ jurisdictions }: SpeciesMapProps) {
  const [svgContent, setSvgContent] = useState<string | null>(svgCache);
  const containerRef = useRef<HTMLDivElement>(null);

  // SVGを1回だけfetch
  useEffect(() => {
    if (svgCache) {
      setSvgContent(svgCache);
      return;
    }
    fetch(JAPAN_MAP_SVG)
      .then((r) => r.text())
      .then((text) => {
        svgCache = text;
        setSvgContent(text);
      })
      .catch((err) => console.error("SVG読み込みエラー:", err));
  }, []);

  // 都道府県→色のマップをメモ化
  const prefColorMap = useMemo(() => {
    const grouped = new Map<string, JurisdictionData[]>();
    for (const j of jurisdictions) {
      const arr = grouped.get(j.jurisdiction_name) || [];
      arr.push(j);
      grouped.set(j.jurisdiction_name, arr);
    }

    const colorMap = new Map<string, string>();
    grouped.forEach((jList, prefName) => {
      let best = 999;
      let selectedCategory = jList[0].category_unified || jList[0].category;
      for (const j of jList) {
        const unified = j.category_unified || j.category;
        const p = CATEGORY_PRIORITY[unified] ?? 999;
        if (p < best) {
          best = p;
          selectedCategory = unified;
        }
      }
      colorMap.set(prefName, getCategoryColor(selectedCategory));
    });

    return colorMap;
  }, [jurisdictions]);

  // SVG挿入後に色を適用
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    // SVGをDOMに挿入
    containerRef.current.innerHTML = svgContent;

    // data-code属性を持つ全要素に色を適用
    const elements = containerRef.current.querySelectorAll<HTMLElement>("[data-code]");
    elements.forEach((el) => {
      const code = Number(el.dataset.code);
      const prefName = CODE_TO_PREF[code];
      if (!prefName) return;

      const color = prefColorMap.get(prefName) ?? "#ffffff";

      // g要素配下の全polygon/path/circleに色を適用
      const shapes = el.querySelectorAll<SVGElement>("polygon, path, circle, rect");
      if (shapes.length > 0) {
        shapes.forEach((shape) => {
          shape.style.fill = color;
        });
      } else {
        // g要素自体がshapeの場合
        el.style.fill = color;
      }
    });
  }, [svgContent, prefColorMap]);

  // 読み込み中
  if (!svgContent) {
    return (
      <div
        className="species-map-container"
        style={{
          height: 150,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#999",
          fontSize: "0.9rem",
        }}
      >
        🗾 地図を読み込み中...
      </div>
    );
  }

  return (
    <div className="species-map-container">
      <h3>📍 分布地図</h3>
      <div
        ref={containerRef}
        className="species-map-svg"
        style={{ width: "100%", lineHeight: 0 }}
      />
      {/* 凡例 */}
      <div className="map-legend-sidebar">
        <div className="legend-title">カテゴリ</div>
        {[
          { color: "#000000", label: "絶滅（EX）" },
          { color: "#542344", label: "野生絶滅（EW）" },
          { color: "#d81e05", label: "CR/Ⅰ類" },
          { color: "#fc7f3f", label: "EN" },
          { color: "#f9e814", label: "VU/Ⅱ類" },
          { color: "#CCE226", label: "NT" },
          { color: "#d1d1c6", label: "DD" },
          { color: "#e5e5e5", label: "指定なし", border: true },
        ].map(({ color, label, border }) => (
          <div key={label} className="legend-item-vertical">
            <div
              className="legend-color-box"
              style={{
                background: color,
                border: border ? "1px solid #ccc" : undefined,
              }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}