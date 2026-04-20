import Link from "next/link";
import { PREFECTURE_CODES } from "@/lib/categoryConstants";

interface SourceRecord {
  id: string;
  jurisdiction_name: string;
  jurisdiction_type: string;
  title: string;
  publication_year: number | null;
  publisher?: string;
  url: string;
}

async function getSources(): Promise<SourceRecord[]> {
  // サーバーサイドでfetchする場合はベースURLが必要なため、
  // fs で直接読む方法が確実
  const fs = await import("fs/promises");
  const path = await import("path");
  const filePath = path.join(process.cwd(), "public/data/sources.json");
  const json = await fs.readFile(filePath, "utf-8");
  return JSON.parse(json);
}

export default async function SourcesPage() {
  const sources = await getSources();

  // PREFECTURE_CODESで並び替え（国→都道府県順→市町村）
  const sorted = [...sources].sort((a, b) => {
    const order = (s: SourceRecord) => {
      if (s.jurisdiction_type === "national") return 0;
      if (s.jurisdiction_type === "prefecture") {
        return PREFECTURE_CODES[s.jurisdiction_name] ?? 999;
      }
      // municipality: 都道府県コード×100で都道府県ごとにまとめる
      return 1000 + (PREFECTURE_CODES[s.jurisdiction_name] ?? 999);
    };
    return order(a) - order(b);
  });

  // jurisdiction_type の表示名
  const typeLabel: Record<string, string> = {
    national: "国",
    prefecture: "都道府県",
    municipality: "市町村",
  };

  return (
    <div
      className="container"
      style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px" }}
    >
      <header style={{ marginBottom: "32px" }}>
        <Link href="/" style={{ color: "var(--brand)", fontSize: "0.9rem" }}>
          ← トップへ戻る
        </Link>
        <h1 style={{ marginTop: "16px", color: "var(--text-heading)" }}>
          📚 データ出典一覧
        </h1>
        <p style={{ color: "var(--text-body)", marginTop: "8px" }}>
          本サイトが使用しているレッドリストの出典情報です。
        </p>
      </header>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.9rem",
        }}
      >
        <thead>
          <tr
            style={{
              background: "var(--bg-page)",
              borderBottom: "2px solid var(--border)",
            }}
          >
            <th style={thStyle}>機関名</th>
            <th style={thStyle}>資料名</th>
            <th style={thStyle}>発行年</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={tdStyle}>{s.jurisdiction_name}</td>
              <td style={tdStyle}>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--brand)" }}
                  >
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: "left" }}>
                {s.publication_year ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  color: "var(--text-heading)",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  color: "var(--text-body)",
  verticalAlign: "top",
};
