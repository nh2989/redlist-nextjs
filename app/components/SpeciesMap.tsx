"use client";

import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";

const JAPAN_TOPO_JSON =
  "https://raw.githubusercontent.com/dataofjapan/land/master/japan.topojson";

interface JurisdictionData {
  jurisdiction_name: string;
  category: string;
  category_unified: string;
}

interface SpeciesMapProps {
  jurisdictions: JurisdictionData[];
}

export default function SpeciesMap({ jurisdictions }: SpeciesMapProps) {
  const getPrefectureCategory = (prefName: string) => {
    const prefJurisdictions = jurisdictions.filter(
      (j) => j.jurisdiction_name === prefName,
    );

    if (prefJurisdictions.length === 0) return null;

    const categoryPriority: { [key: string]: number } = {
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

    let highestPriority = 999;
    let selectedCategory =
      prefJurisdictions[0].category_unified || prefJurisdictions[0].category;

    prefJurisdictions.forEach((j) => {
      const unified = j.category_unified || j.category;
      const priority = categoryPriority[unified] || 999;
      if (priority < highestPriority) {
        highestPriority = priority;
        selectedCategory = unified;
      }
    });

    return selectedCategory;
  };

  const getCategoryColor = (category: string | null) => {
    if (!category) return "#ffffff";

    if (category.includes("絶滅") && !category.includes("危惧")) return "#000000";
    if (category.includes("CR") || category.includes("絶滅危惧Ⅰ類")) return "#d81e05";
    if (category.includes("EN")) return "#fc7f3f";
    if (category.includes("VU") || category.includes("絶滅危惧Ⅱ類")) return "#f9e814";
    if (category.includes("NT") || category.includes("準絶滅危惧")) return "#CCE226";
    if (category.includes("DD") || category.includes("情報不足")) return "#d1d1c6";

    return "#e5e5e5";
  };

  // 座標配列から最小緯度を取得
  const getMinLatitude = (coords: any): number => {
    if (Array.isArray(coords[0])) {
      return Math.min(...coords.map(getMinLatitude));
    }
    return coords[1];
  };

  // MultiPolygonの各パートごとに分割して返す
  const splitMultiPolygon = (geo: any) => {
    const coords = geo.geometry?.coordinates;
    if (!coords) return [geo];

    const geomType = geo.geometry?.type;

    // MultiPolygonの場合、各パートを個別のgeometryとして扱う
    if (geomType === "MultiPolygon") {
      return coords.map((part: any, index: number) => ({
        ...geo,
        geometry: {
          type: "Polygon",
          coordinates: part,
        },
        rsmKey: `${geo.rsmKey}-part${index}`,
      }));
    }

    return [geo];
  };

  // 地図レンダリング関数
  const renderGeographies = (mode: 'main' | 'okinawa' | 'ogasawara') => (
    <Geographies geography={JAPAN_TOPO_JSON}>
      {({ geographies }) => {
        // すべてのgeographyを分割
        const splitGeographies = geographies.flatMap(splitMultiPolygon);

        return splitGeographies
          .filter((geo) => {
            const prefName = geo.properties.nam_ja || "";
            const coordinates = geo.geometry?.coordinates;
            
            if (!coordinates) return false;

            const minLat = getMinLatitude(coordinates);
            
            // 小笠原判定
            const isOgasawaraIsland = prefName === "東京都" && minLat < 30;
            
            // 鹿児島県の南部の島々判定（緯度29.5度未満）
            const isKagoshimaSouthIslands = prefName === "鹿児島県" && minLat < 30.07;
            
            // 沖縄・南西諸島エリア
            const isOkinawaArea = prefName === "沖縄県" || isKagoshimaSouthIslands;

            if (mode === 'okinawa') {
              return isOkinawaArea;
            } else if (mode === 'ogasawara') {
              return isOgasawaraIsland;
            } else {
              return !isOkinawaArea && !isOgasawaraIsland;
            }
          })
          .map((geo) => {
            const prefName = geo.properties.nam_ja || "unknown";
            const category = getPrefectureCategory(prefName);
            const fillColor = getCategoryColor(category);

            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={fillColor}
                stroke="#999999"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: {
                    fill: fillColor,
                    outline: "none",
                    opacity: 0.8,
                  },
                  pressed: { outline: "none" },
                }}
              />
            );
          });
      }}
    </Geographies>
  );

  return (
    <div className="species-map-container">
      <h3>📍 分布地図</h3>

      <div className="species-map-svg">
        {/* メイン地図（沖縄・南西諸島・小笠原以外） */}
        <div className="map-wrapper">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 1200,
              center: [138, 38],
            }}
            width={600}
            height={450}
            style={{
              width: "100%",
              height: "auto",
            }}
          >
            {renderGeographies('main')}
          </ComposableMap>
        </div>

        {/* 沖縄・南西諸島地図（左上） */}
        <div className="okinawa-map-inset">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 2200,
              center: [128.5, 27.5],
            }}
            width={150}
            height={150}
            style={{
              width: "100%",
              height: "auto",
            }}
          >
            {renderGeographies('okinawa')}
          </ComposableMap>
          <div className="inset-label">沖縄・南西諸島</div>
        </div>

        {/* 小笠原地図（右下） */}
        <div className="ogasawara-map-inset">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 6000,
              center: [142.2, 27],
            }}
            width={150}
            height={150}
            style={{
              width: "100%",
              height: "auto",
            }}
          >
            {renderGeographies('ogasawara')}
          </ComposableMap>
          <div className="inset-label">小笠原</div>
        </div>

        {/* 凡例（右上） */}
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