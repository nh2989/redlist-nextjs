"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  Suspense,
  Fragment,
} from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const SpeciesMap = dynamic(() => import("../components/SpeciesMap"), {
  ssr: false,
});

import {
  CATEGORY_LABEL,
  CATEGORY_DISPLAY,
  CATEGORY_PRIORITY,
  ALL_CATEGORIES,
  type CategoryKey,
  PREFECTURE_CODES,
  getCategoryClass,
  isSameCategory,
  getTaxonomyDotColor,
  shortenPrefectureName,
  isAllCategoriesSelected,
  toggleCategoryValue,
  TAXONOMY_EMOJI,
} from "@/lib/categoryConstants";

import type {
  RawSpeciesRecord,
  Jurisdiction,
  SpeciesGroup,
  SourceRecord,
  OrdinalRecord,
} from "@/lib/types";

function getHighestPriorityCategory(jurisdictions: Jurisdiction[]): number {
  const typeOrder = ["national", "prefecture", "municipality"] as const;
  for (const type of typeOrder) {
    const filtered = jurisdictions.filter((j) => j.jurisdiction_type === type);
    if (filtered.length > 0) {
      return Math.min(
        ...filtered.map((j) => CATEGORY_PRIORITY[j.category_unified] ?? 999),
      );
    }
  }
  return 999;
}

function normalizeAliases(
  aliases: string | string[] | null | undefined,
): string[] {
  if (!aliases || aliases === "") return [];
  if (Array.isArray(aliases)) return aliases.filter((a) => a?.trim() !== "");
  return aliases
    .split("|")
    .map((a) => a.trim())
    .filter((a) => a !== "");
}

function matchesOrdinance(
  speciesName: string,
  aliases: string[],
  ordinanceData: OrdinalRecord[],
): boolean {
  const names = new Set([speciesName, ...aliases]);
  return ordinanceData.some((r) => {
    if (names.has(r.species_name)) return true;
    if (!r.species_aliases) return false;
    return r.species_aliases
      .split(/[/／|｜、,]/)
      .map((s) => s.trim())
      .some((a) => a && names.has(a));
  });
}

function getOrdinanceMatches(
  speciesName: string,
  aliases: string[],
  ordinanceData: OrdinalRecord[],
): OrdinalRecord[] {
  const names = new Set([speciesName, ...aliases]);
  return ordinanceData.filter((r) => {
    if (names.has(r.species_name)) return true;
    if (!r.species_aliases) return false;
    return r.species_aliases
      .split(/[/／|｜、,]/)
      .map((s) => s.trim())
      .some((a) => a && names.has(a));
  });
}

// 種カードに表示する学名のバリエーションを取得
// - 各管轄区域の学名をユニーク化
// - 「命名者なし版」が「命名者あり版」の先頭部分(prefix)に一致する場合は、なし版を除外
function getDisplayScientificNames(jurisdictions: Jurisdiction[]): string[] {
  const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

  const names = Array.from(
    new Set(
      jurisdictions
        .map((j) => j.scientific_name)
        .filter((s) => s && s.trim() !== "")
        .map(normalize),
    ),
  );

  return names.filter((name) => {
    return !names.some((other) => {
      if (other === name) return false;
      return other.startsWith(name) && other.length > name.length;
    });
  });
}

function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSearchTerm = searchParams.get("q") || "";
  const initialCategories = searchParams.getAll("category");
  const initialPrefectures = searchParams.getAll("prefecture");
  const initialTaxonomy = searchParams.getAll("taxonomy");
  const initialSort = searchParams.get("sort") || "name";

  const [allSpeciesData, setAllSpeciesData] = useState<RawSpeciesRecord[]>([]);
  const [groupedData, setGroupedData] = useState<SpeciesGroup[]>([]);
  const [filteredData, setFilteredData] = useState<SpeciesGroup[]>([]);
  const [displayData, setDisplayData] = useState<SpeciesGroup[]>([]);
  const [ordinanceData, setOrdinanceData] = useState<OrdinalRecord[]>([]);

  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const [bottomSheet, setBottomSheet] = useState<
    "cat" | "ord" | "pref" | "tax" | null
  >(null);

  const [searchInput, setSearchInput] = useState(initialSearchTerm);
  const [committedSearch, setCommittedSearch] = useState(initialSearchTerm);

  const [categoryFilters, setCategoryFilters] = useState<string[]>(
    initialCategories.length > 0 ? initialCategories : [...ALL_CATEGORIES],
  );
  const [prefectureFilters, setPrefectureFilters] =
    useState<string[]>(initialPrefectures);
  const [availablePrefectures, setAvailablePrefectures] = useState<string[]>(
    [],
  );
  const [prefToMunicipalities, setPrefToMunicipalities] = useState<
    Record<string, string[]>
  >({});

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isOrdinanceOpen, setIsOrdinanceOpen] = useState(false);
  const [isPrefectureOpen, setIsPrefectureOpen] = useState(false);
  const [isTaxonomyOpen, setIsTaxonomyOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const ordinanceDropdownRef = useRef<HTMLDivElement>(null);
  const prefectureDropdownRef = useRef<HTMLDivElement>(null);
  const taxonomyDropdownRef = useRef<HTMLDivElement>(null);

  // 法令・条例フィルター: "national"=国内希少, "prefecture"=都道府県条例
  // "any"=指定あり全体, "national"=国内希少, "prefecture"=条例指定
  const [ordinanceFilters, setOrdinanceFilters] = useState<
    ("any" | "national" | "prefecture")[]
  >([]);

  const [collapsibleHeight, setCollapsibleHeight] = useState<number | null>(
    null,
  );
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const fullHeightRef = useRef<number>(0);

  const [taxonomyFilters, setTaxonomyFilters] =
    useState<string[]>(initialTaxonomy);
  const [sortOrder, setSortOrder] = useState(initialSort);
  const [loading, setLoading] = useState(true);
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesGroup | null>(
    null,
  );
  const [sourceMap, setSourceMap] = useState<Record<string, SourceRecord>>({});
  const [taxonomyList, setTaxonomyList] = useState<
    { canonical: string; aliases: string[] }[]
  >([]);

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

  const availableTaxonomies = taxonomyList
    .map((t) => t.canonical)
    .filter((tax) => allSpeciesData.some((item) => item.taxonomy === tax));

  const allTaxSelected =
    availableTaxonomies.length > 0 &&
    availableTaxonomies.every((t) => taxonomyFilters.includes(t));
  const isTaxFiltered = !allTaxSelected && taxonomyFilters.length > 0;

  // 法令・条例フィルター派生値
  const ordAnyOn = ordinanceFilters.includes("any");
  const ordNatOn = ordinanceFilters.includes("national");
  const ordPrefOn = ordinanceFilters.includes("prefecture");
  const isOrdFiltered = ordAnyOn;

  // 国内希少マッチセット（環境省 ordinanceData）
  const natOrdinanceSet = useMemo(() => {
    const set = new Set<string>();
    for (const species of groupedData) {
      const names = new Set([species.species_name, ...species.species_aliases]);
      if (
        ordinanceData.some((r) => {
          if (r.jurisdiction_name !== "環境省") return false;
          if (names.has(r.species_name)) return true;
          if (!r.species_aliases) return false;
          return r.species_aliases
            .split(/[/／|｜、,]/)
            .map((s: string) => s.trim())
            .some((a: string) => a && names.has(a));
        })
      )
        set.add(species.species_name);
    }
    return set;
  }, [groupedData, ordinanceData]);

  // 都道府県条例マッチセット
  const prefOrdinanceSet = useMemo(() => {
    const set = new Set<string>();
    for (const species of groupedData) {
      const names = new Set([species.species_name, ...species.species_aliases]);
      if (
        ordinanceData.some((r) => {
          if (r.jurisdiction_name === "環境省") return false;
          if (names.has(r.species_name)) return true;
          if (!r.species_aliases) return false;
          return r.species_aliases
            .split(/[/／|｜、,]/)
            .map((s: string) => s.trim())
            .some((a: string) => a && names.has(a));
        })
      )
        set.add(species.species_name);
    }
    return set;
  }, [groupedData, ordinanceData]);

  // 条例指定種のセット（リスト表示用キャッシュ）
  const ordinanceMatchSet = useMemo(() => {
    const set = new Set<string>();
    for (const species of groupedData) {
      if (
        matchesOrdinance(
          species.species_name,
          species.species_aliases,
          ordinanceData,
        )
      ) {
        set.add(species.species_name);
      }
    }
    return set;
  }, [groupedData, ordinanceData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setCommittedSearch(trimmed);
    const params = new URLSearchParams(window.location.search);
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }

  function handleClearSearch() {
    setSearchInput("");
    setCommittedSearch("");
  }

  function handleTaxonomyAllChange(checked: boolean) {
    setTaxonomyFilters(checked ? [...availableTaxonomies] : []);
  }
  function toggleTaxonomyFilter(tax: string) {
    setTaxonomyFilters((prev) =>
      prev.includes(tax) ? prev.filter((t) => t !== tax) : [...prev, tax],
    );
  }
  function handleCategoryAllChange(checked: boolean) {
    setCategoryFilters(checked ? [...ALL_CATEGORIES] : []);
  }
  function toggleCategoryFilter(value: string) {
    setCategoryFilters((prev) => toggleCategoryValue(prev, value));
  }
  function handlePrefectureAllChange(checked: boolean) {
    setPrefectureFilters(checked ? [...availableAllPrefs] : []);
  }
  function togglePrefectureFilter(pref: string) {
    setPrefectureFilters((prev) =>
      prev.includes(pref) ? prev.filter((v) => v !== pref) : [...prev, pref],
    );
  }
  function toggleMunicipalityFilter(muni: string) {
    setPrefectureFilters((prev) =>
      prev.includes(muni) ? prev.filter((v) => v !== muni) : [...prev, muni],
    );
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    if (collapsibleRef.current) {
      fullHeightRef.current = collapsibleRef.current.scrollHeight;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.touches[0].clientY;
    const full = fullHeightRef.current;
    if (full === 0) return;
    if (isHeaderCollapsed) {
      const next = Math.min(Math.max(0, -dy), full);
      setCollapsibleHeight(next);
    } else {
      const next = Math.min(Math.max(0, full - dy), full);
      setCollapsibleHeight(next);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    const threshold = fullHeightRef.current * 0.5;
    if (dy > threshold) setIsHeaderCollapsed(true);
    else if (dy < -threshold) setIsHeaderCollapsed(false);
    setCollapsibleHeight(null);
    touchStartY.current = null;
  }

  function openBottomSheet(key: "cat" | "ord" | "pref" | "tax") {
    setBottomSheet(key);
    document.body.style.overflow = "hidden";
  }

  function closeBottomSheet() {
    setBottomSheet(null);
    document.body.style.overflow = "";
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [
        fileListRes,
        sourcesRes,
        synonymsRes,
        taxonomiesRes,
        ordFileListRes,
      ] = await Promise.all([
        fetch("/api/data-files"),
        fetch("/data/sources.json"),
        fetch("/data/synonyms.json").catch(() => null),
        fetch("/data/taxonomies.json").catch(() => null),
        fetch("/api/data-files?type=ordinance"),
      ]);

      const fileNames: string[] = await fileListRes.json();
      const dataFiles = fileNames.map((name) => ({
        id: name.replace(".json", ""),
        path: `/data/redlist/${name}`,
      }));

      const dataResponses = await Promise.all(
        dataFiles.map((f) => fetch(f.path).catch(() => null)),
      );

      const synonyms: Record<string, string> = synonymsRes
        ? await synonymsRes.json().catch(() => ({}))
        : {};

      const taxonomyListData: { canonical: string; aliases: string[] }[] =
        taxonomiesRes ? await taxonomiesRes.json().catch(() => []) : [];
      const taxonomyMap: Record<string, string> = {};
      for (const entry of taxonomyListData) {
        for (const alias of entry.aliases) taxonomyMap[alias] = entry.canonical;
      }
      setTaxonomyList(taxonomyListData);

      const sources: SourceRecord[] = await sourcesRes.json().catch(() => []);
      const srcMap = Object.fromEntries(sources.map((s) => [s.id, s]));
      setSourceMap(srcMap);

      const dataArrays = await Promise.all(
        dataResponses.map((res) =>
          res ? res.json().catch(() => []) : Promise.resolve([]),
        ),
      );

      const allData: RawSpeciesRecord[] = dataFiles.flatMap((file, i) => {
        const items: RawSpeciesRecord[] = dataArrays[i] ?? [];
        return items.map((item) => ({
          ...item,
          taxonomy: taxonomyMap[item.taxonomy] ?? item.taxonomy,
          source_id: file.id,
          species_aliases: normalizeAliases(item.species_aliases),
          publication_year: srcMap[file.id]?.publication_year ?? null,
        }));
      });

      setAllSpeciesData(allData);

      const prefList = Object.keys(PREFECTURE_CODES)
        .filter((pref) =>
          allData.some(
            (item) =>
              item.jurisdiction_name === pref ||
              item.parent_prefecture === pref,
          ),
        )
        .sort((a, b) => PREFECTURE_CODES[a] - PREFECTURE_CODES[b]);
      setAvailablePrefectures(prefList);

      const muniMap: Record<string, string[]> = {};
      allData
        .filter((item) => item.jurisdiction_type === "municipality")
        .forEach((item) => {
          const parent = item.parent_prefecture ?? "";
          if (!muniMap[parent]) muniMap[parent] = [];
          if (!muniMap[parent].includes(item.jurisdiction_name)) {
            muniMap[parent].push(item.jurisdiction_name);
          }
        });
      Object.keys(muniMap).forEach((pref) => {
        muniMap[pref].sort();
      });
      setPrefToMunicipalities(muniMap);

      if (initialPrefectures.length === 0) {
        setPrefectureFilters(["環境省", ...prefList]);
      }

      const taxList = taxonomyListData
        .map((t) => t.canonical)
        .filter((tax) => allData.some((item) => item.taxonomy === tax));
      if (initialTaxonomy.length === 0) {
        setTaxonomyFilters(taxList);
      }

      const ordFileNames: string[] = await ordFileListRes
        .json()
        .catch(() => []);
      const ordResponses = await Promise.all(
        ordFileNames.map((name) =>
          fetch(`/data/ordinance/${name}`).catch(() => null),
        ),
      );
      const ordArrays = await Promise.all(
        ordResponses.map((res) =>
          res ? res.json().catch(() => []) : Promise.resolve([]),
        ),
      );
      setOrdinanceData(ordArrays.flat());

      setGroupedData(groupBySpecies(allData, synonyms));
    } catch (error) {
      console.error("データ読み込みエラー:", error);
    } finally {
      setLoading(false);
    }
  }

  function groupBySpecies(
    data: RawSpeciesRecord[],
    synonyms: Record<string, string>,
  ): SpeciesGroup[] {
    const speciesMap: Record<string, SpeciesGroup> = {};
    data.forEach((item) => {
      const key = synonyms[item.species_name] ?? item.species_name;
      if (!speciesMap[key]) {
        speciesMap[key] = {
          species_name: key,
          species_aliases: [],
          scientific_name: item.scientific_name,
          taxonomy: item.taxonomy,
          jurisdictions: [],
        };
      }

      // 各レコードのspecies_aliasesをマージ（重複・自分自身を除外）
      const itemAliases = (item.species_aliases as string[]) || [];
      for (const alias of itemAliases) {
        if (alias !== key && !speciesMap[key].species_aliases.includes(alias)) {
          speciesMap[key].species_aliases.push(alias);
        }
      }

      if (
        synonyms[item.species_name] &&
        !speciesMap[key].species_aliases.includes(item.species_name)
      ) {
        speciesMap[key].species_aliases.push(item.species_name);
      }

      speciesMap[key].jurisdictions.push({
        jurisdiction_name: item.jurisdiction_name,
        jurisdiction_type: item.jurisdiction_type,
        parent_prefecture: item.parent_prefecture,
        category: item.category,
        category_unified: item.category_unified,
        scientific_name: item.scientific_name,
        source_id: item.source_id,
        original_name: item.species_name,
        original_aliases: (item.species_aliases as string[]) || [],
        publication_year: item.publication_year,
      });
    });

    Object.values(speciesMap).forEach((species: SpeciesGroup) => {
      species.jurisdictions.sort((a: Jurisdiction, b: Jurisdiction) => {
        const typeOrder: Record<string, number> = {
          national: 0,
          prefecture: 1,
          municipality: 2,
        };
        if (typeOrder[a.jurisdiction_type] !== typeOrder[b.jurisdiction_type]) {
          return (
            typeOrder[a.jurisdiction_type] - typeOrder[b.jurisdiction_type]
          );
        }
        return (
          (PREFECTURE_CODES[a.jurisdiction_name] || 999) -
          (PREFECTURE_CODES[b.jurisdiction_name] || 999)
        );
      });
    });

    return Object.values(speciesMap);
  }

  useEffect(() => {
    filterResults();
  }, [
    committedSearch,
    categoryFilters,
    prefectureFilters,
    taxonomyFilters,
    ordinanceFilters,
    groupedData,
    availablePrefectures,
    prefToMunicipalities,
    natOrdinanceSet,
    prefOrdinanceSet,
  ]);

  function filterResults() {
    let filtered = groupedData;

    if (committedSearch) {
      const searchLower = committedSearch.toLowerCase();
      filtered = filtered.filter(
        (species) =>
          species.species_name.toLowerCase().includes(searchLower) ||
          species.species_aliases.some((alias: string) =>
            alias.toLowerCase().includes(searchLower),
          ) ||
          species.scientific_name.toLowerCase().includes(searchLower),
      );
    }

    if (categoryFilters.length === 0) {
      setFilteredData([]);
      return;
    }

    const currentAllMunis = Object.values(prefToMunicipalities).flat();
    const currentPrefOnly = prefectureFilters.filter(
      (p) => !currentAllMunis.includes(p),
    );
    const anyMuniSelected = prefectureFilters.some((p) =>
      currentAllMunis.includes(p),
    );

    if (
      currentPrefOnly.length === 0 &&
      availablePrefectures.length > 0 &&
      !anyMuniSelected
    ) {
      setFilteredData([]);
      return;
    }

    const hasCat = !isAllCategoriesSelected(categoryFilters);
    const currentAllPrefsSelected =
      availableAllPrefs.length > 1 &&
      availableAllPrefs.every((p) => currentPrefOnly.includes(p));

    filtered = filtered.filter((species) =>
      species.jurisdictions.some((j: Jurisdiction) => {
        const matchCat =
          !hasCat ||
          categoryFilters.some((cat) =>
            isSameCategory(j.category_unified, cat),
          );
        const matchPref = (() => {
          if (j.jurisdiction_type === "municipality") {
            return prefectureFilters.includes(j.jurisdiction_name);
          }
          if (currentAllPrefsSelected) return true;
          return prefectureFilters.includes(j.jurisdiction_name);
        })();
        return matchCat && matchPref;
      }),
    );

    if (taxonomyFilters.length > 0 && !allTaxSelected) {
      filtered = filtered.filter((species) =>
        taxonomyFilters.includes(species.taxonomy),
      );
    }

    // 法令・条例フィルター
    if (ordAnyOn) {
      filtered = filtered.filter((species) => {
        const name = species.species_name;
        if (ordNatOn && natOrdinanceSet.has(name)) return true;
        if (ordPrefOn && prefOrdinanceSet.has(name)) return true;
        return false;
      });
    }

    setFilteredData(filtered);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
      if (
        prefectureDropdownRef.current &&
        !prefectureDropdownRef.current.contains(e.target as Node)
      ) {
        setIsPrefectureOpen(false);
      }
      if (
        ordinanceDropdownRef.current &&
        !ordinanceDropdownRef.current.contains(e.target as Node)
      ) {
        setIsOrdinanceOpen(false);
      }
      if (
        taxonomyDropdownRef.current &&
        !taxonomyDropdownRef.current.contains(e.target as Node)
      ) {
        setIsTaxonomyOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    sortResults();
  }, [filteredData, sortOrder]);

  function sortResults() {
    let sorted = [...filteredData];
    const taxonomyOrder: Record<string, number> = {};
    taxonomyList.forEach((t, i) => {
      taxonomyOrder[t.canonical] = i;
    });
    const getTaxOrder = (tax: string) => taxonomyOrder[tax] ?? 999;

    if (sortOrder === "name") {
      sorted.sort((a, b) => {
        const taxCompare = getTaxOrder(a.taxonomy) - getTaxOrder(b.taxonomy);
        if (taxCompare !== 0) return taxCompare;
        return a.species_name.localeCompare(b.species_name, "ja");
      });
    } else if (sortOrder === "jurisdiction-desc") {
      sorted.sort(
        (a, b) =>
          filterJurisdictionsForDisplay(b.jurisdictions).length -
          filterJurisdictionsForDisplay(a.jurisdictions).length,
      );
    } else if (sortOrder === "jurisdiction-asc") {
      sorted.sort(
        (a, b) =>
          filterJurisdictionsForDisplay(a.jurisdictions).length -
          filterJurisdictionsForDisplay(b.jurisdictions).length,
      );
    } else if (sortOrder === "scientific") {
      sorted.sort((a, b) => {
        const taxCompare = getTaxOrder(a.taxonomy) - getTaxOrder(b.taxonomy);
        if (taxCompare !== 0) return taxCompare;
        return a.scientific_name.localeCompare(b.scientific_name);
      });
    } else if (sortOrder === "category") {
      sorted.sort((a, b) => {
        const pa = getHighestPriorityCategory(
          filterJurisdictionsForDisplay(a.jurisdictions),
        );
        const pb = getHighestPriorityCategory(
          filterJurisdictionsForDisplay(b.jurisdictions),
        );
        if (pa !== pb) return pa - pb;
        const taxCompare = getTaxOrder(a.taxonomy) - getTaxOrder(b.taxonomy);
        if (taxCompare !== 0) return taxCompare;
        return a.species_name.localeCompare(b.species_name, "ja");
      });
    }
    setDisplayData(sorted);
    setVisibleCount(PAGE_SIZE);
    scrollAreaRef.current?.scrollTo({ top: 0 });
  }

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollArea = scrollAreaRef.current;
    if (!sentinel || !scrollArea) return;
    if (visibleCount >= displayData.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { root: scrollArea, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, displayData.length]);

  function openModal(species: SpeciesGroup) {
    setSelectedSpecies(species);
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    setSelectedSpecies(null);
    document.body.style.overflow = "";
  }

  function filterJurisdictionsForDisplay(
    jurisdictions: Jurisdiction[],
  ): Jurisdiction[] {
    let filtered = jurisdictions;
    if (categoryFilters.length === 0) return [];
    const anyMuniSelected = prefectureFilters.some((p) =>
      allMunicipalities.includes(p),
    );
    if (
      prefOnlyFilters.length === 0 &&
      availablePrefectures.length > 0 &&
      !anyMuniSelected
    )
      return [];
    if (!isAllCategoriesSelected(categoryFilters)) {
      filtered = filtered.filter((j) =>
        categoryFilters.some((cat) => isSameCategory(j.category_unified, cat)),
      );
    }
    filtered = filtered.filter((j) => {
      if (j.jurisdiction_type === "municipality")
        return prefectureFilters.includes(j.jurisdiction_name);
      if (allPrefSelected) return true;
      return prefectureFilters.includes(j.jurisdiction_name);
    });
    return filtered;
  }

  function groupJurisdictionsByType(jurisdictions: Jurisdiction[]) {
    return {
      national: jurisdictions.filter((j) => j.jurisdiction_type === "national"),
      prefecture: jurisdictions.filter(
        (j) => j.jurisdiction_type === "prefecture",
      ),
      municipality: jurisdictions.filter(
        (j) => j.jurisdiction_type === "municipality",
      ),
    };
  }

  if (loading) {
    return (
      <div className="search-layout">
        <div className="search-sticky-header">
          <div className="search-header-row">
            <h1 className="search-title">🌿 絶滅危惧種横断検索</h1>
          </div>
        </div>
        <div className="search-results-scroll">
          <div className="loading-spinner-wrap">
            <div className="loading-spinner" />
            <p className="loading-spinner-text">データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  const taxonomyOrder: Record<string, number> = {};
  taxonomyList.forEach((t, i) => {
    taxonomyOrder[t.canonical] = i;
  });

  const visibleData = displayData.slice(0, visibleCount);
  const hasMore = visibleCount < displayData.length;

  const taxonomyGroupMap = new Map<string, SpeciesGroup[]>();
  for (const species of visibleData) {
    const existing = taxonomyGroupMap.get(species.taxonomy);
    if (existing) {
      existing.push(species);
    } else {
      taxonomyGroupMap.set(species.taxonomy, [species]);
    }
  }

  const taxonomyGroups = Array.from(taxonomyGroupMap.entries())
    .sort(([a], [b]) => (taxonomyOrder[a] ?? 999) - (taxonomyOrder[b] ?? 999))
    .map(([taxonomy, items]) => ({ taxonomy, items }));

  const isFiltered =
    isCatFiltered ||
    isPrefFiltered ||
    hasMuniSelected ||
    isTaxFiltered ||
    !!committedSearch;
  const nothingSelected =
    categoryFilters.length === 0 ||
    (prefOnlyFilters.length === 0 &&
      availablePrefectures.length > 0 &&
      !hasMuniSelected);
  const resultCountText = nothingSelected
    ? "絞り込み条件が選択されていません"
    : isFiltered
      ? `🔍 絞り込み中 — ${displayData.length}件`
      : `全${displayData.length}件を表示中`;

  return (
    <>
      <div className="search-layout">
        {/* ══ 固定ヘッダー部 ══ */}
        <div
          className={`search-sticky-header${isHeaderCollapsed ? " header-collapsed" : ""}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="search-header-row">
            <h1 className="search-title">
              <Link
                href="/"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "inline",
                }}
              >
                🌿 絶滅危惧種横断検索
              </Link>
            </h1>
            <Link
              href="/sources"
              style={{
                marginLeft: "auto",
                fontSize: "var(--fs-sm)",
                color: "var(--text-faint)",
                whiteSpace: "nowrap",
                textDecoration: "underline",
                textDecorationColor: "var(--border)",
                textUnderlineOffset: "3px",
              }}
            >
              📚 データ出典
            </Link>
          </div>

          <div
            className="header-collapsible"
            ref={collapsibleRef}
            style={
              collapsibleHeight !== null
                ? {
                    maxHeight: `${collapsibleHeight}px`,
                    transition: "none",
                    overflow: "hidden",
                  }
                : undefined
            }
          >
            <form onSubmit={handleSearch} style={{ marginBottom: "8px" }}>
              <div
                style={{ display: "flex", gap: "6px", alignItems: "center" }}
              >
                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="種名・学名で検索..."
                    style={{
                      width: "100%",
                      padding:
                        searchInput || committedSearch
                          ? "7px 30px 7px 12px"
                          : "7px 12px",
                      fontSize: "var(--fs-base)",
                      border: committedSearch
                        ? "2px solid var(--brand)"
                        : "1px solid var(--border)",
                      borderRadius: "6px",
                      background: "var(--bg-page)",
                      color: "var(--text-body)",
                      outline: "none",
                    }}
                  />
                  {(searchInput || committedSearch) && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      aria-label="検索をクリア"
                      style={{
                        position: "absolute",
                        right: "6px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-faint)",
                        fontSize: "13px",
                        padding: "2px 4px",
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  style={{
                    padding: "7px 14px",
                    fontSize: "var(--fs-sm)",
                    fontWeight: 600,
                    background: "var(--brand)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  検索
                </button>
              </div>
            </form>

            <div className="filters" style={{ marginBottom: "6px" }}>
              <button
                className={`filter-sheet-btn${isCatFiltered ? " filter-sheet-btn--active" : ""} sp-only`}
                onClick={() => openBottomSheet("cat")}
              >
                <span>
                  カテゴリ{isCatFiltered ? ` (${categoryFilters.length})` : ""}
                </span>
                <span className="dropdown-arrow">▼</span>
              </button>
              <button
                className={`filter-sheet-btn${isOrdFiltered ? " filter-sheet-btn--active filter-sheet-btn--ord" : ""} sp-only`}
                onClick={() => openBottomSheet("ord")}
              >
                <span>
                  指定
                  {ordAnyOn ? (ordNatOn && ordPrefOn ? " (2)" : " (1)") : ""}
                </span>
                <span className="dropdown-arrow">▼</span>
              </button>
              <div
                className="multi-select-dropdown pc-only"
                ref={categoryDropdownRef}
              >
                <button
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
                        onChange={() => toggleCategoryFilter("EX")}
                      />
                      絶滅（EX）
                    </label>
                    <label className="multi-select-option">
                      <input
                        type="checkbox"
                        checked={categoryFilters.includes("EW")}
                        onChange={() => toggleCategoryFilter("EW")}
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
                          onChange={() => toggleCategoryFilter("CREN")}
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
                          onChange={() => toggleCategoryFilter("CR")}
                        />
                        絶滅危惧ⅠＡ類（CR）
                      </label>
                      <label className="multi-select-option muni-option">
                        <input
                          type="checkbox"
                          checked={categoryFilters.includes("EN")}
                          onChange={() => toggleCategoryFilter("EN")}
                        />
                        絶滅危惧ⅠＢ類（EN）
                      </label>
                    </div>
                    {(["VU", "NT", "DD", "LP", "OTHER"] as const).map((key) => (
                      <label key={key} className="multi-select-option">
                        <input
                          type="checkbox"
                          checked={categoryFilters.includes(key)}
                          onChange={() => toggleCategoryFilter(key)}
                        />
                        {CATEGORY_DISPLAY[key]}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* ══ 法令・条例 PC ドロップダウン ══ */}
              <div
                className="multi-select-dropdown pc-only"
                ref={ordinanceDropdownRef}
              >
                <button
                  className={`multi-select-btn${isOrdFiltered ? " multi-select-btn--active multi-select-btn--ord" : ""}`}
                  onClick={() => setIsOrdinanceOpen((v) => !v)}
                >
                  <span>法令・条例</span>
                  {ordAnyOn && (
                    <span className="filter-badge">
                      {ordNatOn && ordPrefOn ? "2" : "1"}
                    </span>
                  )}
                  <span className="dropdown-arrow">
                    {isOrdinanceOpen ? "▲" : "▼"}
                  </span>
                </button>
                {isOrdinanceOpen && (
                  <div className="multi-select-options">
                    <label className="multi-select-option multi-select-option--all">
                      <input
                        type="checkbox"
                        checked={!ordAnyOn}
                        onChange={(e) => {
                          if (e.target.checked) setOrdinanceFilters([]);
                        }}
                      />
                      すべて（指定なしを含む）
                    </label>
                    <hr
                      style={{
                        margin: "4px 0",
                        border: "none",
                        borderTop: "1px solid var(--border)",
                      }}
                    />
                    <div className="pref-row-with-badge">
                      <label
                        className="multi-select-option"
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <input
                          type="checkbox"
                          checked={ordAnyOn}
                          onChange={() =>
                            setOrdinanceFilters((prev) =>
                              prev.includes("any")
                                ? []
                                : ["any", "national", "prefecture"],
                            )
                          }
                        />
                        指定あり
                      </label>
                    </div>
                    <div className="muni-sub-list">
                      <div className="muni-sub-note">個別に選択可能</div>
                      <label
                        className={`multi-select-option muni-option${!ordAnyOn ? " muni-option--disabled" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={ordNatOn}
                          disabled={!ordAnyOn}
                          onChange={() =>
                            setOrdinanceFilters((prev) => {
                              const next = prev.includes("national")
                                ? prev.filter((v) => v !== "national")
                                : [...prev, "national"];
                              const hasNat = next.includes("national");
                              const hasPref = next.includes("prefecture");
                              return (hasNat || hasPref ? next : []) as (
                                | "any"
                                | "national"
                                | "prefecture"
                              )[];
                            })
                          }
                        />
                        国内希少野生動植物種
                      </label>
                      <label
                        className={`multi-select-option muni-option${!ordAnyOn ? " muni-option--disabled" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={ordPrefOn}
                          disabled={!ordAnyOn}
                          onChange={() =>
                            setOrdinanceFilters((prev) => {
                              const next = prev.includes("prefecture")
                                ? prev.filter((v) => v !== "prefecture")
                                : [...prev, "prefecture"];
                              const hasNat = next.includes("national");
                              const hasPref = next.includes("prefecture");
                              return (hasNat || hasPref ? next : []) as (
                                | "any"
                                | "national"
                                | "prefecture"
                              )[];
                            })
                          }
                        />
                        都道府県条例による指定種
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <button
                className={`filter-sheet-btn${isPrefFiltered || hasMuniSelected ? " filter-sheet-btn--active" : ""} sp-only`}
                onClick={() => openBottomSheet("pref")}
              >
                <span>
                  都道府県
                  {isPrefFiltered || hasMuniSelected
                    ? ` (${prefOnlyFilters.length + activeMuniTags.length})`
                    : ""}
                </span>
                <span className="dropdown-arrow">▼</span>
              </button>
              <div
                className="multi-select-dropdown pc-only"
                ref={prefectureDropdownRef}
              >
                <button
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
                        onChange={() => togglePrefectureFilter("環境省")}
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
                      return (
                        <div key={pref}>
                          <div className="pref-row-with-badge">
                            <label
                              className="multi-select-option"
                              style={{ flex: 1, marginBottom: 0 }}
                            >
                              <input
                                type="checkbox"
                                checked={prefectureFilters.includes(pref)}
                                onChange={() => togglePrefectureFilter(pref)}
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
                                    onChange={() =>
                                      toggleMunicipalityFilter(muni)
                                    }
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

              <button
                className={`filter-sheet-btn${isTaxFiltered ? " filter-sheet-btn--active" : ""} sp-only`}
                onClick={() => openBottomSheet("tax")}
              >
                <span>
                  分類群{isTaxFiltered ? ` (${taxonomyFilters.length})` : ""}
                </span>
                <span className="dropdown-arrow">▼</span>
              </button>
              <div
                className="multi-select-dropdown pc-only"
                ref={taxonomyDropdownRef}
              >
                <button
                  className={`multi-select-btn${isTaxFiltered ? " multi-select-btn--active" : ""}`}
                  onClick={() => setIsTaxonomyOpen((v) => !v)}
                >
                  <span>分類群</span>
                  {isTaxFiltered && (
                    <span className="filter-badge">
                      {taxonomyFilters.length}
                    </span>
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
                          onChange={() => toggleTaxonomyFilter(tax)}
                        />
                        {TAXONOMY_EMOJI[tax] ?? "🔹"} {tax}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {(activeCategoryTags.length > 0 ||
              activePrefTags.length > 0 ||
              activeMuniTags.length > 0 ||
              isTaxFiltered ||
              ordAnyOn) && (
              <div
                className="active-filter-tags"
                style={{ marginBottom: "6px" }}
              >
                {activeCategoryTags.map((cat) => (
                  <button
                    key={cat}
                    className="active-tag active-tag--cat"
                    onClick={() => {
                      const next = toggleCategoryValue(categoryFilters, cat);
                      setCategoryFilters(
                        next.length === 0 || isAllCategoriesSelected(next)
                          ? [...ALL_CATEGORIES]
                          : next,
                      );
                    }}
                  >
                    {CATEGORY_DISPLAY[cat] ?? cat} ✕
                  </button>
                ))}
                {activePrefTags.map((pref) => (
                  <button
                    key={pref}
                    className="active-tag active-tag--pref"
                    onClick={() => {
                      const next = prefectureFilters.filter((p) => p !== pref);
                      const nextPrefOnly = next.filter(
                        (p) => !allMunicipalities.includes(p),
                      );
                      const allSelected = availableAllPrefs.every((p) =>
                        nextPrefOnly.includes(p),
                      );
                      setPrefectureFilters(
                        nextPrefOnly.length === 0 || allSelected
                          ? [...availableAllPrefs]
                          : next,
                      );
                    }}
                  >
                    {pref} ✕
                  </button>
                ))}
                {isTaxFiltered &&
                  taxonomyFilters.map((tax) => (
                    <button
                      key={tax}
                      className="active-tag active-tag--tax"
                      onClick={() => {
                        const next = taxonomyFilters.filter((t) => t !== tax);
                        setTaxonomyFilters(
                          next.length === 0 ? [...availableTaxonomies] : next,
                        );
                      }}
                    >
                      {tax} ✕
                    </button>
                  ))}
                {activeMuniTags.map((muni) => (
                  <button
                    key={muni}
                    className="active-tag active-tag--muni"
                    onClick={() => toggleMunicipalityFilter(muni)}
                  >
                    {muni} ✕
                  </button>
                ))}
                {ordAnyOn && !ordNatOn && !ordPrefOn && (
                  <button
                    className="active-tag active-tag--ord-nat"
                    onClick={() => setOrdinanceFilters([])}
                  >
                    指定あり ✕
                  </button>
                )}
                {ordNatOn && (
                  <button
                    className="active-tag active-tag--ord-nat"
                    onClick={() =>
                      setOrdinanceFilters((prev) =>
                        prev.filter((v) => v !== "national"),
                      )
                    }
                  >
                    国内希少 ✕
                  </button>
                )}
                {ordPrefOn && (
                  <button
                    className="active-tag active-tag--ord-pref"
                    onClick={() =>
                      setOrdinanceFilters((prev) =>
                        prev.filter((v) => v !== "prefecture"),
                      )
                    }
                  >
                    条例指定 ✕
                  </button>
                )}
              </div>
            )}

            <div className="search-meta-row">
              <span className="result-count" style={{ margin: 0 }}>
                {resultCountText}
              </span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{
                    fontSize: "var(--fs-sm)",
                    fontFamily: "inherit",
                    width: "auto",
                  }}
                >
                  <option value="name">種名</option>
                  <option value="category">カテゴリ</option>
                  <option value="jurisdiction-desc">指定箇所（降順）</option>
                  <option value="jurisdiction-asc">指定箇所（昇順）</option>
                  <option value="scientific">学名（A→Z）</option>
                </select>
              </div>
            </div>

            {!nothingSelected && displayData.length > 0 && (
              <div className="category-legend">
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
              </div>
            )}
          </div>

          <div
            className="swipe-hint-bar"
            onClick={() => setIsHeaderCollapsed((v) => !v)}
            role="button"
            aria-label={
              isHeaderCollapsed ? "フィルターを表示" : "フィルターを隠す"
            }
          />
        </div>

        {/* ══ スクロール結果エリア ══ */}
        <div className="search-results-scroll" ref={scrollAreaRef}>
          <div className="results">
            {displayData.length === 0 ? (
              <div className="no-results">
                {nothingSelected
                  ? "絞り込み条件を選択してください。"
                  : "該当する種が見つかりませんでした。"}
              </div>
            ) : (
              <>
                {taxonomyGroups.map(({ taxonomy, items }) => (
                  <div key={taxonomy}>
                    <div className="taxonomy-group-header">
                      <span>
                        {TAXONOMY_EMOJI[taxonomy] ?? "🔹"} {taxonomy}
                      </span>
                    </div>
                    <div className="card-group">
                      {items.map((species, index) => {
                        const visibleJurisdictions =
                          filterJurisdictionsForDisplay(species.jurisdictions);
                        const { national, prefecture, municipality } =
                          groupJurisdictionsByType(visibleJurisdictions);
                        const hasNatOrdinance = natOrdinanceSet.has(
                          species.species_name,
                        );
                        const hasPrefOrdinance = prefOrdinanceSet.has(
                          species.species_name,
                        );
                        const displayScientificNames =
                          getDisplayScientificNames(species.jurisdictions);
                        return (
                          <div
                            key={index}
                            className="species-card"
                            onClick={() => openModal(species)}
                          >
                            <div className="card-left">
                              <div className="card-name-row">
                                <h3>{species.species_name}</h3>
                                {(hasNatOrdinance || hasPrefOrdinance) && (
                                  <div className="card-ord-badges">
                                    {hasNatOrdinance && (
                                      <span className="nat-ord-badge">
                                        国内希少
                                      </span>
                                    )}
                                    {hasPrefOrdinance && (
                                      <span className="pref-ord-badge">
                                        条例指定
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {species.species_aliases.length > 0 && (
                                <div className="card-aliases">
                                  （{species.species_aliases.join("、")}）
                                </div>
                              )}
                              {displayScientificNames.length > 0 && (
                                <span className="scientific">
                                  {displayScientificNames.join(" / ")}
                                </span>
                              )}
                            </div>
                            <div className="card-right">
                              {national.length > 0 && (
                                <div className="desg-row">
                                  <span className="desg-label">国</span>
                                  <div className="org-list">
                                    {national.map(
                                      (j: Jurisdiction, i: number) => (
                                        <span
                                          key={i}
                                          className={`org-item ${getCategoryClass(j.category_unified)}`}
                                        >
                                          {j.jurisdiction_name}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                              {prefecture.length > 0 && (
                                <div className="desg-row">
                                  <span className="desg-label">都道府県</span>
                                  <div className="org-list">
                                    {prefecture.map(
                                      (j: Jurisdiction, i: number) => (
                                        <span
                                          key={i}
                                          className={`org-item ${getCategoryClass(j.category_unified)}`}
                                        >
                                          {shortenPrefectureName(
                                            j.jurisdiction_name,
                                          )}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                              {municipality.length > 0 && (
                                <div className="desg-row">
                                  <span className="desg-label">市町村</span>
                                  <div className="org-list">
                                    {municipality.map(
                                      (j: Jurisdiction, i: number) => (
                                        <span
                                          key={i}
                                          className={`org-item ${getCategoryClass(j.category_unified)}`}
                                        >
                                          {j.jurisdiction_name}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div
                  ref={sentinelRef}
                  style={{
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isLoadingMore && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "var(--fs-xs)",
                        color: "var(--text-faint)",
                      }}
                    >
                      <span
                        style={{
                          width: "13px",
                          height: "13px",
                          border: "2px solid var(--border)",
                          borderTopColor: "var(--text-faint)",
                          borderRadius: "50%",
                          display: "inline-block",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                      読み込み中...
                    </span>
                  )}
                  {!hasMore && displayData.length > 0 && (
                    <span
                      style={{
                        fontSize: "var(--fs-xs)",
                        color: "var(--text-faint)",
                      }}
                    >
                      全{displayData.length}件を表示しました
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══ ボトムシート ══ */}
      {bottomSheet &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="bottom-sheet-overlay" onClick={closeBottomSheet}>
            <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="bottom-sheet-handle" onClick={closeBottomSheet} />
              <div className="bottom-sheet-title">
                <span>
                  {bottomSheet === "cat"
                    ? "カテゴリを選択"
                    : bottomSheet === "ord"
                      ? "法令・条例指定"
                      : bottomSheet === "pref"
                        ? "都道府県を選択"
                        : "分類群を選択"}
                </span>
                <button
                  className="bottom-sheet-close"
                  onClick={closeBottomSheet}
                >
                  ✕
                </button>
              </div>
              <div className="bottom-sheet-body">
                {bottomSheet === "cat" && (
                  <>
                    <label className="sheet-option sheet-option--all">
                      <input
                        type="checkbox"
                        checked={allCatSelected}
                        onChange={(e) =>
                          handleCategoryAllChange(e.target.checked)
                        }
                      />
                      <span>すべて</span>
                    </label>
                    {(["EX", "EW"] as const).map((key) => (
                      <label key={key} className="sheet-option">
                        <input
                          type="checkbox"
                          checked={categoryFilters.includes(key)}
                          onChange={() => toggleCategoryFilter(key)}
                        />
                        <span>{CATEGORY_DISPLAY[key]}</span>
                      </label>
                    ))}
                    <label className="sheet-option">
                      <input
                        type="checkbox"
                        checked={categoryFilters.includes("CREN")}
                        onChange={() => toggleCategoryFilter("CREN")}
                      />
                      <span>絶滅危惧Ⅰ類（CR+EN）</span>
                    </label>
                    <label className="sheet-option sheet-option--sub">
                      <input
                        type="checkbox"
                        checked={categoryFilters.includes("CR")}
                        onChange={() => toggleCategoryFilter("CR")}
                      />
                      <span>絶滅危惧ⅠＡ類（CR）</span>
                    </label>
                    <label className="sheet-option sheet-option--sub">
                      <input
                        type="checkbox"
                        checked={categoryFilters.includes("EN")}
                        onChange={() => toggleCategoryFilter("EN")}
                      />
                      <span>絶滅危惧ⅠＢ類（EN）</span>
                    </label>
                    {(["VU", "NT", "DD", "LP", "OTHER"] as const).map((key) => (
                      <label key={key} className="sheet-option">
                        <input
                          type="checkbox"
                          checked={categoryFilters.includes(key)}
                          onChange={() => toggleCategoryFilter(key)}
                        />
                        <span>{CATEGORY_DISPLAY[key]}</span>
                      </label>
                    ))}
                  </>
                )}
                {bottomSheet === "pref" && (
                  <>
                    <label className="sheet-option sheet-option--all">
                      <input
                        type="checkbox"
                        checked={allPrefSelected}
                        onChange={(e) =>
                          handlePrefectureAllChange(e.target.checked)
                        }
                      />
                      <span>すべて</span>
                    </label>
                    <div className="sheet-section-label">国</div>
                    <label className="sheet-option">
                      <input
                        type="checkbox"
                        checked={prefectureFilters.includes("環境省")}
                        onChange={() => togglePrefectureFilter("環境省")}
                      />
                      <span>環境省</span>
                    </label>
                    <div className="sheet-section-label">都道府県</div>
                    {availablePrefectures.map((pref) => {
                      const munis = prefToMunicipalities[pref] ?? [];
                      const hasMunis = munis.length > 0;
                      return (
                        <div key={pref}>
                          <label className="sheet-option">
                            <input
                              type="checkbox"
                              checked={prefectureFilters.includes(pref)}
                              onChange={() => togglePrefectureFilter(pref)}
                            />
                            <span>{pref}</span>
                            {hasMunis && (
                              <span
                                className="muni-exists-badge"
                                style={{ marginLeft: "auto" }}
                              >
                                市町村あり
                              </span>
                            )}
                          </label>
                          {hasMunis &&
                            munis.map((muni) => (
                              <label
                                key={muni}
                                className="sheet-option sheet-option--sub"
                              >
                                <input
                                  type="checkbox"
                                  checked={prefectureFilters.includes(muni)}
                                  onChange={() =>
                                    toggleMunicipalityFilter(muni)
                                  }
                                />
                                <span>{muni}</span>
                              </label>
                            ))}
                        </div>
                      );
                    })}
                  </>
                )}
                {bottomSheet === "ord" && (
                  <>
                    <label className="sheet-option sheet-option--all">
                      <input
                        type="checkbox"
                        checked={!ordAnyOn}
                        onChange={(e) => {
                          if (e.target.checked) setOrdinanceFilters([]);
                        }}
                      />
                      <span>すべて（指定なしを含む）</span>
                    </label>
                    <label className="sheet-option">
                      <input
                        type="checkbox"
                        checked={ordAnyOn}
                        onChange={() =>
                          setOrdinanceFilters((prev) =>
                            prev.includes("any")
                              ? []
                              : ["any", "national", "prefecture"],
                          )
                        }
                      />
                      <span>指定あり</span>
                    </label>
                    <label className="sheet-option sheet-option--sub">
                      <input
                        type="checkbox"
                        checked={ordNatOn}
                        disabled={!ordAnyOn}
                        onChange={() =>
                          setOrdinanceFilters((prev) => {
                            const next = prev.includes("national")
                              ? prev.filter((v) => v !== "national")
                              : [...prev, "national"];
                            const hasNat = next.includes("national");
                            const hasPref = next.includes("prefecture");
                            return (hasNat || hasPref ? next : []) as (
                              | "any"
                              | "national"
                              | "prefecture"
                            )[];
                          })
                        }
                        style={{ accentColor: "#cc8800" }}
                      />
                      <span style={{ opacity: ordAnyOn ? 1 : 0.4 }}>
                        国内希少野生動植物種
                      </span>
                    </label>
                    <label className="sheet-option sheet-option--sub">
                      <input
                        type="checkbox"
                        checked={ordPrefOn}
                        disabled={!ordAnyOn}
                        onChange={() =>
                          setOrdinanceFilters((prev) => {
                            const next = prev.includes("prefecture")
                              ? prev.filter((v) => v !== "prefecture")
                              : [...prev, "prefecture"];
                            const hasNat = next.includes("national");
                            const hasPref = next.includes("prefecture");
                            return (hasNat || hasPref ? next : []) as (
                              | "any"
                              | "national"
                              | "prefecture"
                            )[];
                          })
                        }
                        style={{ accentColor: "#5f5e5a" }}
                      />
                      <span style={{ opacity: ordAnyOn ? 1 : 0.4 }}>
                        都道府県条例による指定種
                      </span>
                    </label>
                  </>
                )}
                {bottomSheet === "tax" && (
                  <>
                    <label className="sheet-option sheet-option--all">
                      <input
                        type="checkbox"
                        checked={allTaxSelected}
                        onChange={(e) =>
                          handleTaxonomyAllChange(e.target.checked)
                        }
                      />
                      <span>すべて</span>
                    </label>
                    {availableTaxonomies.map((tax) => (
                      <label key={tax} className="sheet-option">
                        <input
                          type="checkbox"
                          checked={taxonomyFilters.includes(tax)}
                          onChange={() => toggleTaxonomyFilter(tax)}
                        />
                        <span>
                          {TAXONOMY_EMOJI[tax] ?? "🔹"} {tax}
                        </span>
                      </label>
                    ))}
                  </>
                )}
              </div>
              <div className="bottom-sheet-foot">
                <button
                  className="bottom-sheet-apply"
                  onClick={closeBottomSheet}
                >
                  適用
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ══ モーダル ══ */}
      {selectedSpecies &&
        (() => {
          const visibleJurisdictions = filterJurisdictionsForDisplay(
            selectedSpecies.jurisdictions,
          );
          const { national, prefecture, municipality } =
            groupJurisdictionsByType(visibleJurisdictions);
          const ordinanceMatches = getOrdinanceMatches(
            selectedSpecies.species_name,
            selectedSpecies.species_aliases,
            ordinanceData,
          );
          const natOrdMatches = ordinanceMatches.filter(
            (m) => m.jurisdiction_name === "環境省",
          );
          const modalDisplayScientificNames = getDisplayScientificNames(
            selectedSpecies.jurisdictions,
          );
          return (
            <div className="modal-overlay" onClick={closeModal}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <button className="modal-close" onClick={closeModal}>
                  ×
                </button>

                {/* ══ モーダルヘッダー ══ */}
                <div className="modal-header-info">
                  <div className="modal-header-top">
                    <div className="modal-header-name-row">
                      <h2>
                        {selectedSpecies.species_name}
                        {selectedSpecies.species_aliases.length > 0 && (
                          <span className="species-aliases">
                            （ {selectedSpecies.species_aliases.join(", ")}）
                          </span>
                        )}
                      </h2>
                      <p className="taxonomy-label">
                        {selectedSpecies.taxonomy}
                      </p>
                    </div>
                    <p className="scientific">
                      {modalDisplayScientificNames.join(" / ")}
                    </p>
                  </div>
                  {/* 環境省レッドリストカテゴリ + 条例指定 */}
                  {(() => {
                    const nat = selectedSpecies.jurisdictions.find(
                      (j) => j.jurisdiction_type === "national",
                    );
                    return nat ? (
                      <div className="national-status">
                        <div className="national-status-row">
                          <span className="national-status-label">環境省</span>
                          <span
                            className={`category ${getCategoryClass(nat.category_unified)}`}
                          >
                            {CATEGORY_LABEL[nat.category_unified] ??
                              nat.category_unified}
                          </span>
                          <span className="national-status-original">
                            （{nat.category}）
                          </span>
                        </div>
                        {natOrdMatches.map((m, i) => (
                          <div key={i} className="nat-ord-block">
                            <div className="pref-ord-top">
                              {" "}
                              {/* バッジ + 年（左固定） */}
                              <span className="ord-badge-nat">
                                {m.designation_name}
                              </span>
                              {m.designated_year && (
                                <span className="ord-year">
                                  {m.designated_year}年指定
                                </span>
                              )}
                            </div>
                            <div className="ord-law-group">
                              {" "}
                              {/* 法令名 + 特記事項（右側、スマホでは縦） */}
                              <div className="ord-law">{m.ordinance_name}</div>
                              {m.note && (
                                <span className="ordinance-modal-note">
                                  {m.note}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* ══ モーダルボディ ══ */}
                <div className="modal-body">
                  {(prefecture.length > 0 || municipality.length > 0) && (
                    <h3>📍 指定状況</h3>
                  )}{" "}
                  {prefecture.length > 0 && (
                    <SpeciesMap jurisdictions={prefecture} />
                  )}
                  {/* 都道府県テーブル */}
                  {prefecture.length > 0 && (
                    <>
                      <h4 style={{ marginTop: "20px" }}>🗾 詳細情報</h4>
                      <div className="prefecture-table-wrapper">
                        <table className="prefecture-table">
                          <thead>
                            <tr>
                              <th>機関</th>
                              <th>和名</th>
                              <th>学名</th>
                              <th>統一カテゴリ</th>
                              <th>出典カテゴリ</th>
                              <th>発行年</th>
                            </tr>
                          </thead>
                          <tbody>
                            {prefecture.map((j: Jurisdiction, i: number) => {
                              const prefOrdMatches = ordinanceMatches.filter(
                                (m) =>
                                  m.jurisdiction_name === j.jurisdiction_name,
                              );
                              const hasOrd = prefOrdMatches.length > 0;
                              return (
                                <Fragment key={i}>
                                  <tr
                                    className={
                                      hasOrd ? "pref-row--has-ord" : ""
                                    }
                                  >
                                    <td>{j.jurisdiction_name}</td>
                                    <td className="wamei-cell">
                                      {j.original_aliases.length > 0
                                        ? `${j.original_name}（${j.original_aliases.join("、")}）`
                                        : j.original_name}
                                    </td>
                                    <td className="scientific-cell">
                                      {j.scientific_name || "—"}
                                    </td>
                                    <td>
                                      <span
                                        className={`category ${getCategoryClass(j.category_unified)}`}
                                      >
                                        {CATEGORY_LABEL[j.category_unified] ??
                                          j.category_unified}
                                      </span>
                                    </td>
                                    <td>{j.category}</td>
                                    <td>{j.publication_year ?? "—"}</td>
                                  </tr>
                                  {hasOrd &&
                                    prefOrdMatches.map((m, mi) => (
                                      <tr
                                        key={`ord-${mi}`}
                                        className="pref-ord-row"
                                      >
                                        <td colSpan={6}>
                                          <div className="pref-ord-block">
                                            <div className="pref-ord-top">
                                              <span className="ord-badge-pref">
                                                {m.designation_name}
                                              </span>
                                              {m.designated_year && (
                                                <span className="ord-year">
                                                  {m.designated_year}年指定
                                                </span>
                                              )}
                                            </div>
                                            <div className="ord-law">
                                              {m.ordinance_name}
                                            </div>
                                            {m.note && (
                                              <span className="ordinance-modal-note">
                                                {m.note}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  {/* 市町村テーブル */}
                  {municipality.length > 0 && (
                    <>
                      <h4 style={{ marginTop: "24px" }}>🏘️ 市町村の指定状況</h4>
                      <div className="prefecture-table-wrapper">
                        <table className="prefecture-table">
                          <thead>
                            <tr>
                              <th>機関</th>
                              <th>和名</th>
                              <th>学名</th>
                              <th>統一カテゴリ</th>
                              <th>出典カテゴリ</th>
                              <th>発行年</th>
                            </tr>
                          </thead>
                          <tbody>
                            {municipality.map((j: Jurisdiction, i: number) => (
                              <tr key={i}>
                                <td>{j.jurisdiction_name}</td>
                                <td className="wamei-cell">
                                  {j.original_aliases.length > 0
                                    ? `${j.original_name}（${j.original_aliases.join("、")}）`
                                    : j.original_name}
                                </td>{" "}
                                <td className="scientific-cell">
                                  {j.scientific_name || "—"}
                                </td>
                                <td>
                                  <span
                                    className={`category ${getCategoryClass(j.category_unified)}`}
                                  >
                                    {CATEGORY_LABEL[j.category_unified] ??
                                      j.category_unified}
                                  </span>
                                </td>
                                <td>{j.category}</td>
                                <td>{j.publication_year ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="loading">読み込み中...</div>}>
      <SearchPage />
    </Suspense>
  );
}
