"use client";

import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import { ComposableMap, Geography } from "react-simple-maps";

const JAPAN_TOPO_JSON = "/japan.topojson";

// ========== コンポーネント外の定数・関数（再生成されない） ==========

const CATEGORY_PRIORITY: Record<string, number> = {
  絶滅: 1,
  EX: 1,
  CR: 2,
  EN: 3,
  絶滅危惧Ⅰ類: 2.5,
  VU: 4,
  絶滅危惧Ⅱ類: 4,
  NT: 5,
  準絶滅危惧: 5,
  DD: 6,
  情報不足: 6,
};

function getCategoryColor(category: string | null): string {
  if (!category) return "#ffffff";
  if (category.includes("絶滅") && !category.includes("危惧")) return "#000000";
  if (category.includes("CR") || category.includes("絶滅危惧Ⅰ類")) return "#d81e05";
  if (category.includes("EN")) return "#fc7f3f";
  if (category.includes("VU") || category.includes("絶滅危惧Ⅱ類")) return "#f9e814";
  if (category.includes("NT") || category.includes("準絶滅危惧")) return "#CCE226";
  if (category.includes("DD") || category.includes("情報不足")) return "#d1d1c6";
  return "#e5e5e5";
}

function getMinLatitude(coords: any): number {
  if (Array.isArray(coords[0])) return Math.min(...coords.map(getMinLatitude));
  return coords[1];
}

// ========== モジュールレベルのキャッシュ（アプリ全体で1回だけ処理） ==========
// モーダルを何度開いても、2回目以降は即座に表示される

interface GeoFeature {
  rsmKey: string;
  properties: { nam_ja?: string };
  geometry: { type: string; coordinates: any };
}

interface GeoCache {
  main: GeoFeature[];
  okinawa: GeoFeature[];
  ogasawara: GeoFeature[];
}

let geoCache: GeoCache | null = null;

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
  const [geoData, setGeoData] = useState<GeoCache | null>(geoCache);

  // TopoJSONの取得・分割・振り分けを1回だけ実行
  useEffect(() => {
    if (geoCache) {
      setGeoData(geoCache);
      return;
    }

    fetch(JAPAN_TOPO_JSON)
      .then((r) => r.json())
      .then((topology) => {
        // TopoJSON → GeoJSON変換
        const firstObject = Object.values(topology.objects)[0] as any;
        const geojson = feature(topology, firstObject) as any;
        const rawFeatures: any[] = geojson.features;

        // MultiPolygon分割（1回だけ）
        const splitFeatures: GeoFeature[] = rawFeatures.flatMap(
          (geo: any, i: number) => {
            if (geo.geometry?.type === "MultiPolygon") {
              return geo.geometry.coordinates.map(
                (part: any, j: number): GeoFeature => ({
                  ...geo,
                  rsmKey: `geo-${i}-part${j}`,
                  geometry: { type: "Polygon", coordinates: part },
                })
              );
            }
            return [{ ...geo, rsmKey: `geo-${i}` }] as GeoFeature[];
          }
        );

        // 3エリアに振り分け（1回だけ）
        const main: GeoFeature[] = [];
        const okinawa: GeoFeature[] = [];
        const ogasawara: GeoFeature[] = [];

        splitFeatures.forEach((geo) => {
          const prefName = geo.properties.nam_ja || "";
          const coords = geo.geometry?.coordinates;
          if (!coords) return;

          const minLat = getMinLatitude(coords);
          const isOgasawara = prefName === "東京都" && minLat < 30;
          const isOkinawaArea =
            prefName === "沖縄県" ||
            (prefName === "鹿児島県" && minLat < 30.07);

          if (isOgasawara) ogasawara.push(geo);
          else if (isOkinawaArea) okinawa.push(geo);
          else main.push(geo);
        });

        geoCache = { main, okinawa, ogasawara };
        setGeoData(geoCache);
      })
      .catch((err) => console.error("TopoJSON読み込みエラー:", err));
  }, []); // 空配列 → アプリ起動後1回だけ実行

  // 都道府県→色のマップをメモ化（jurisdictionsが変わらない限り再計算しない）
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
        const p = CATEGORY_PRIORITY[unified] || 999;
        if (p < best) {
          best = p;
          selectedCategory = unified;
        }
      }
      colorMap.set(prefName, getCategoryColor(selectedCategory));
    });

    return colorMap;
  }, [jurisdictions]);

  // 地図1枚分のレンダリング（キャッシュ済みデータを受け取るだけ）
  const renderGeos = (geos: GeoFeature[]) =>
    geos.map((geo) => {
      const color = prefColorMap.get(geo.properties.nam_ja ?? "") ?? "#e5e5e5";
      return (
        <Geography
          key={geo.rsmKey}
          geography={geo}
          fill={color}
          stroke="#999999"
          strokeWidth={0.5}
          style={{
            default: { outline: "none" },
            hover: { outline: "none", opacity: 0.8, fill: color },
            pressed: { outline: "none" },
          }}
        />
      );
    });

  // 読み込み中の表示
  if (!geoData) {
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

      <div className="species-map-svg">
        {/* メイン地図（沖縄・南西諸島・小笠原以外） */}
        <div className="map-wrapper">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 1200, center: [137.5, 38] }}
            width={600}
            height={450}
            style={{ width: "100%", height: "auto" }}
          >
            {renderGeos(geoData.main)}
          </ComposableMap>
        </div>

        {/* 沖縄・南西諸島地図（左上） */}
        <div className="okinawa-map-inset">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 2200, center: [128.5, 27.5] }}
            width={150}
            height={150}
            style={{ width: "100%", height: "auto" }}
          >
            {renderGeos(geoData.okinawa)}
          </ComposableMap>
          <div className="inset-label">沖縄・南西諸島</div>
        </div>

        {/* 小笠原地図（右下） */}
        <div className="ogasawara-map-inset">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 6000, center: [142.2, 27] }}
            width={150}
            height={150}
            style={{ width: "100%", height: "auto" }}
          >
            {renderGeos(geoData.ogasawara)}
          </ComposableMap>
          <div className="inset-label">小笠原</div>
        </div>

        {/* 凡例 */}
        <div className="map-legend-sidebar">
          <div className="legend-title">カテゴリ</div>
          <div className="legend-item-vertical">
            <div className="legend-color-box" style={{ background: "#000000" }}></div>
            <span>絶滅（EX）</span>
          </div>
          <div className="legend-item-vertical">
            <div className="legend-color-box" style={{ background: "#d81e05" }}></div>
            <span>CR/Ⅰ類</span>
          </div>
          <div className="legend-item-vertical">
            <div className="legend-color-box" style={{ background: "#fc7f3f" }}></div>
            <span>EN</span>
          </div>
          <div className="legend-item-vertical">
            <div className="legend-color-box" style={{ background: "#f9e814" }}></div>
            <span>VU/Ⅱ類</span>
          </div>
          <div className="legend-item-vertical">
            <div className="legend-color-box" style={{ background: "#CCE226" }}></div>
            <span>NT</span>
          </div>
          <div className="legend-item-vertical">
            <div className="legend-color-box" style={{ background: "#d1d1c6" }}></div>
            <span>DD</span>
          </div>
          <div className="legend-item-vertical">
            <div className="legend-color-box" style={{ background: "#ffffff", border: "1px solid #ccc" }}></div>
            <span>指定なし</span>
          </div>
        </div>
      </div>
    </div>
  );
}