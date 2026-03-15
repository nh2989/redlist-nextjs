"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORY_COLORS,
  CATEGORY_PRIORITY,
  CODE_TO_PREF,
  getCategoryColor,
} from "@/lib/categoryConstants";
import type { Jurisdiction } from "@/lib/types";

const JAPAN_MAP_SVG = "/japan-map.svg";

let svgCache: string | null = null;

interface SpeciesMapProps {
  jurisdictions: Jurisdiction[];
}

export default function SpeciesMap({ jurisdictions }: SpeciesMapProps) {
  const [svgContent, setSvgContent] = useState<string | null>(svgCache);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const prefColorMap = useMemo(() => {
    const grouped = new Map<string, Jurisdiction[]>();
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

  useEffect(() => {
    if (!svgContent || !containerRef.current) return;
    containerRef.current.innerHTML = svgContent;
    containerRef.current
      .querySelectorAll<HTMLElement>("[data-code]")
      .forEach((el) => {
        const prefName = CODE_TO_PREF[Number(el.dataset.code)];
        if (!prefName) return;
        const color = prefColorMap.get(prefName) ?? CATEGORY_COLORS.NONE;
        const shapes = el.querySelectorAll<SVGElement>(
          "polygon, path, circle, rect",
        );
        if (shapes.length > 0) {
          shapes.forEach((s) => {
            s.style.fill = color;
          });
        } else {
          el.style.fill = color;
        }
      });
  }, [svgContent, prefColorMap]);

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
        style={{ width: "100%", lineHeight: 0, padding: "2vh" }}
      />
      <div className="map-legend-sidebar">
        <div className="legend-title">カテゴリ</div>
        {(
          [
            { key: "EX", label: "絶滅（EX）" },
            { key: "EW", label: "野生絶滅（EW）" },
            { key: "CR", label: "Ⅰ類（CR+EN）" },
            { key: "VU", label: "Ⅱ類（VU）" },
            { key: "NT", label: "準絶滅危惧（NT）" },
            { key: "DD", label: "情報不足（DD）" },
            { key: "OTHER", label: "その他指定あり" },
            { key: "NONE", label: "指定なし", border: true },
          ] as { key: keyof typeof CATEGORY_COLORS; label: string; border?: boolean }[]
        ).map(({ key, label, border }) => (
          <div key={key} className="legend-item-vertical">
            <div
              className="legend-color-box"
              style={{
                background: CATEGORY_COLORS[key],
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