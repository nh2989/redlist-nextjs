"use client";

import { useEffect } from "react";

const JAPAN_TOPO_JSON =
  "https://raw.githubusercontent.com/dataofjapan/land/master/japan.topojson";

export default function PreloadTopoJson() {
  useEffect(() => {
    console.log("🗾 TopoJSON プリロード開始...");

    const startTime = performance.now();

    fetch(JAPAN_TOPO_JSON)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(() => {
        const loadTime = Math.round(performance.now() - startTime);
        console.log(`✅ TopoJSON プリロード完了（${loadTime}ms）`);
      })
      .catch((error) => {
        console.error("❌ TopoJSON プリロードエラー:", error);
      });
  }, []);

  // 何も表示しない
  return null;
}
