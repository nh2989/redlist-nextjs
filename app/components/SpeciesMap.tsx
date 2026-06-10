"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORY_COLORS,
  CATEGORY_PRIORITY,
  CODE_TO_PREF,
  getCategoryClass,
  getCategoryColor,
} from "@/lib/categoryConstants";
import type { CategoryKey } from "@/lib/categoryConstants";
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
      <div
        ref={containerRef}
        className="species-map-svg"
        style={{ width: "100%", lineHeight: 0, padding: "2vh" }}
      />
      <div className="map-legend-sidebar">
        {(
          [
            { key: "EX", full: "絶滅（EX）", short: "EX" },
            { key: "EW", full: "野生絶滅（EW）", short: "EW" },
            { key: "CREN", full: "Ⅰ類（CR+EN）", short: "CR+EN" },
            { key: "VU", full: "Ⅱ類（VU）", short: "VU" },
            { key: "NT", full: "準絶滅危惧（NT）", short: "NT" },
            { key: "DD", full: "情報不足（DD）", short: "DD" },
            { key: "LP", full: "地域個体群（LP）", short: "LP" },
            { key: "OTHER", full: "その他指定", short: "他" },
          ] as { key: CategoryKey; full: string; short: string }[]
        ).map(({ key, full, short }) => (
          <span
            key={key}
            className={`org-item ${getCategoryClass(key)}`}
            style={{ cursor: "default" }}
          >
            <span className="legend-label-full">{full}</span>
            <span className="legend-label-short">{short}</span>
          </span>
        ))}
        <span
          className="org-item"
          style={{
            cursor: "default",
            background: CATEGORY_COLORS.NONE,
            border: "1px solid #ccc",
            color: "#999",
          }}
        >
          <span className="legend-label-full">指定なし</span>
          <span className="legend-label-short">なし</span>
        </span>
      </div>
    </div>
  );
}
