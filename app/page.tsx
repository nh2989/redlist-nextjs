'use client'

import { useState, useEffect, useRef } from 'react'

// カテゴリマッピング（同じ意味のカテゴリをグループ化）
const CATEGORY_MAPPINGS: { [key: string]: string[] } = {
  'EX': ['絶滅（EX）', '絶滅', 'EX', '絶滅種'],
  'CR + EN': [
    '絶滅危惧ⅠA類（CR）', '絶滅危惧ⅠA類', 'ⅠA類', 'CR',
    '絶滅危惧Ⅰ類（CR + EN）', '絶滅危惧1A類',
    '絶滅危惧ⅠB類（EN）', '絶滅危惧ⅠB類',
    '絶滅危惧Ⅰ類','Ⅰ類', 'ⅠB類', 'EN', '絶滅危惧1B類',
    '絶滅寸前種','絶滅危惧種'
  ],
  'VU': ['絶滅危惧Ⅱ類（VU）', '絶滅危惧Ⅱ類', 'Ⅱ類', 'VU', '絶滅危惧2類','絶滅危機増大種'],
  'NT': ['準絶滅危惧（NT）', '準絶滅危惧', '準絶滅危惧種','希少種', 'NT'],
  'DD': ['情報不足（DD）', '情報不足', 'DD'],
  'LP': ['絶滅のおそれのある地域個体群（LP）', '地域個体群', 'LP']
}

// カテゴリが同じグループかチェックする関数
function isSameCategory(category1: string, category2: string): boolean {
  if (!category1 || !category2) return false
  if (category1 === category2) return true
  
  for (let group in CATEGORY_MAPPINGS) {
    const variations = CATEGORY_MAPPINGS[group]
    const cat1InGroup = variations.some(v => category1.includes(v))
    const cat2InGroup = variations.some(v => category2.includes(v))
    if (cat1InGroup && cat2InGroup) return true
  }
  return false
}

export default function Home() {
  // State（状態管理）
  const [allSpeciesData, setAllSpeciesData] = useState<any[]>([])
  const [groupedData, setGroupedData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [displayData, setDisplayData] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [prefectureFilter, setPrefectureFilter] = useState('')
  const [taxonomyFilter, setTaxonomyFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('name')
  const [loading, setLoading] = useState(true)
  const [selectedSpecies, setSelectedSpecies] = useState<any>(null)
  
  // オートコンプリート用
  const [autocompleteItems, setAutocompleteItems] = useState<any[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // データ読み込み（初回のみ）
  useEffect(() => {
    loadData()
  }, [])

  // データ読み込み関数
  async function loadData() {
    setLoading(true)
    try {
      const dataFiles = [
        '/data/sample.json',
        '/data/shiga.json',
        '/data/kyoto.json',
        '/data/osaka.json',
        '/data/aichi.json',
        '/data/hiroshima.json',
      ]
      
      const responses = await Promise.all(
        dataFiles.map(file => fetch(file))
      )
      
      const dataArrays = await Promise.all(
        responses.map(response => response.json())
      )
      
      const allData = dataArrays.flat()
      setAllSpeciesData(allData)
      
      // グループ化
      const grouped = groupBySpecies(allData)
      setGroupedData(grouped)
      setFilteredData(grouped)
      setDisplayData(grouped)
      
    } catch (error) {
      console.error('データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // グループ化関数（和名でグループ化）
  function groupBySpecies(data: any[]) {
    const speciesMap: any = {}
    
    data.forEach(item => {
      const key = item.species_name
      
      if (!speciesMap[key]) {
        speciesMap[key] = {
          species_name: item.species_name,
          scientific_name: item.scientific_name,
          taxonomy: item.taxonomy,
          prefectures: []
        }
      }
      
      speciesMap[key].prefectures.push({
        prefecture: item.prefecture,
        category: item.category,
        scientific_name: item.scientific_name
      })
    })
    
    return Object.values(speciesMap)
  }

  // フィルタリング処理
  useEffect(() => {
    filterResults()
  }, [searchTerm, categoryFilter, prefectureFilter, taxonomyFilter, groupedData])

  function filterResults() {
    let filtered = groupedData

    // 検索テキスト
    if (searchTerm) {
      filtered = filtered.filter(species => 
        species.species_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        species.scientific_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // カテゴリフィルター（CATEGORY_MAPPINGSを使用）
    if (categoryFilter) {
      filtered = filtered.filter(species => 
        species.prefectures.some((p: any) => isSameCategory(p.category, categoryFilter))
      )
    }

    // 都道府県フィルター
    if (prefectureFilter) {
      filtered = filtered.filter(species => 
        species.prefectures.some((p: any) => p.prefecture === prefectureFilter)
      )
    }

    // 分類フィルター
    if (taxonomyFilter) {
      filtered = filtered.filter(species => species.taxonomy === taxonomyFilter)
    }

    setFilteredData(filtered)
  }

  // 並び替え処理
  useEffect(() => {
    sortResults()
  }, [filteredData, sortOrder])

  function sortResults() {
    let sorted = [...filteredData]
    
    if (sortOrder === 'name') {
      // 種名順（あいうえお順）
      sorted.sort((a, b) => a.species_name.localeCompare(b.species_name, 'ja'))
    } else if (sortOrder === 'prefecture-desc') {
      // 指定地域が多い順
      sorted.sort((a, b) => b.prefectures.length - a.prefectures.length)
    } else if (sortOrder === 'prefecture-asc') {
      // 指定地域が少ない順
      sorted.sort((a, b) => a.prefectures.length - b.prefectures.length)
    } else if (sortOrder === 'scientific') {
      // 学名順（アルファベット順）
      sorted.sort((a, b) => a.scientific_name.localeCompare(b.scientific_name))
    }
    
    setDisplayData(sorted)
  }

  // オートコンプリート候補を生成
  useEffect(() => {
    if (searchTerm.length >= 1) {
      const candidates = groupedData.filter(species => 
        species.species_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        species.scientific_name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 8) // 最大8件
      
      setAutocompleteItems(candidates)
      setShowAutocomplete(candidates.length > 0)
    } else {
      setShowAutocomplete(false)
    }
  }, [searchTerm, groupedData])

  // オートコンプリート項目を選択
  function selectAutocompleteItem(species: any) {
    setSearchTerm(species.species_name)
    setShowAutocomplete(false)
    setAutocompleteIndex(-1)
  }

  // キーボード操作
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showAutocomplete) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAutocompleteIndex(prev => 
        prev < autocompleteItems.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAutocompleteIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (autocompleteIndex >= 0) {
        selectAutocompleteItem(autocompleteItems[autocompleteIndex])
      }
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false)
      setAutocompleteIndex(-1)
    }
  }

  // 検索ボックスクリア
  function clearSearch() {
    setSearchTerm('')
    setShowAutocomplete(false)
    searchInputRef.current?.focus()
  }

  // カテゴリに応じたCSSクラス（修正版）
  function getCategoryClass(category: string) {
    if (category.includes('絶滅（EX）') || category.includes('EX')) return 'category-ex'
    if (category.includes('Ⅰ') || category.includes('CR') ||
        category.includes('寸前') || category.includes('EN') ||
        category.includes('絶滅危惧種')) return 'category-en'
    if (category.includes('Ⅱ類') || category.includes('VU') || 
        category.includes('増大')) return 'category-vu'
    if (category.includes('準') || category.includes('NT') || 
        category.includes('希少')) return 'category-nt'
    if (category.includes('情報不足') || category.includes('要注目種') || 
        category.includes('DD')) return 'category-dd'
    return 'category-other'
  }

  // モーダルを開く
  function openModal(species: any) {
    setSelectedSpecies(species)
  }

  // モーダルを閉じる
  function closeModal() {
    setSelectedSpecies(null)
  }

  // 読み込み中
  if (loading) {
    return (
      <div className="loading">読み込み中...</div>
    )
  }

  return (
    <>
      <div className="container">
        <header>
          <h1>🌿 絶滅危惧種検索サイト</h1>
          <p className="subtitle">日本の絶滅危惧種を検索・閲覧できます</p>
        </header>

        <div className="search-section">
          <div className="search-box-wrapper">
            <input 
              ref={searchInputRef}
              type="text" 
              id="searchBox"
              placeholder="種名または学名で検索..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={clearSearch}
                aria-label="検索クリア"
              >
                ×
              </button>
            )}
            
            {/* オートコンプリート */}
            {showAutocomplete && (
              <div className="autocomplete-list">
                {autocompleteItems.map((species, index) => (
                  <div
                    key={index}
                    className={`autocomplete-item ${index === autocompleteIndex ? 'active' : ''}`}
                    onClick={() => selectAutocompleteItem(species)}
                  >
                    <div className="autocomplete-name">{species.species_name}</div>
                    <div className="autocomplete-scientific">{species.scientific_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="filters">
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">カテゴリ：すべて</option>
              <option value="絶滅（EX）">絶滅（EX）</option>
              <option value="ⅠA類">絶滅危惧ⅠA類（CR）</option>
              <option value="ⅠB類">絶滅危惧ⅠB類（EN）</option>
              <option value="Ⅱ類">絶滅危惧Ⅱ類（VU）</option>
              <option value="準">準絶滅危惧（NT）</option>
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
            </select>
            
            <select 
              value={taxonomyFilter}
              onChange={(e) => setTaxonomyFilter(e.target.value)}
            >
              <option value="">分類：すべて</option>
              <option value="植物">植物</option>
              <option value="動物">動物</option>
            </select>

            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="name">種名順（あいうえお順）</option>
              <option value="prefecture-desc">指定地域が多い順</option>
              <option value="prefecture-asc">指定地域が少ない順</option>
              <option value="scientific">学名順（アルファベット順）</option>
            </select>
          </div>
          
          <div className="result-count">
            {displayData.length}件の種が見つかりました
          </div>
        </div>
        
        <div className="results">
          {displayData.length === 0 ? (
            <div className="no-results">該当する種が見つかりませんでした。</div>
          ) : (
            displayData.map((species, index) => (
              <div 
                key={index} 
                className="species-card"
                onClick={() => openModal(species)}
              >
                <h3>{species.species_name}</h3>
                <p className="scientific">{species.scientific_name}</p>
                <div className="prefecture-badges">
                  {species.prefectures.map((p: any, i: number) => (
                    <span key={i} className={`category ${getCategoryClass(p.category)}`}>
                      {p.prefecture}
                    </span>
                  ))}
                </div>
                <div className="meta-info">
                  <span className="meta-item">🔬 {species.taxonomy}</span>
                  <span className="meta-item">📍 {species.prefectures.length}県</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <footer>
        <p>データ出典：環境省・都道府県レッドリスト</p>
      </footer>

      {/* モーダル */}
      {selectedSpecies && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            
            <h2>{selectedSpecies.species_name}</h2>
            <p className="scientific">{selectedSpecies.scientific_name}</p>
            <p className="taxonomy-label">分類：{selectedSpecies.taxonomy}</p>
            
            <h3>指定状況</h3>
            <table className="prefecture-table">
              <thead>
                <tr>
                  <th>都道府県</th>
                  <th>学名</th>
                  <th>カテゴリ</th>
                </tr>
              </thead>
              <tbody>
                {selectedSpecies.prefectures.map((p: any, i: number) => (
                  <tr key={i}>
                    <td>{p.prefecture}</td>
                    <td className="scientific-cell">{p.scientific_name}</td>
                    <td>
                      <span className={`category ${getCategoryClass(p.category)}`}>
                        {p.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}