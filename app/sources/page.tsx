import Link from "next/link";
import { PREFECTURE_CODES } from "@/lib/categoryConstants";

interface SourceRecord {
  id: string;
  jurisdiction_name: string;
  jurisdiction_type: string;
  parent_prefecture?: string;
  title: string;
  publication_year: number | string | null;
  publisher?: string;
  url: string;
}

async function getSources(): Promise<SourceRecord[]> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const filePath = path.join(process.cwd(), "public/data/sources.json");
  const json = await fs.readFile(filePath, "utf-8");
  return JSON.parse(json);
}

export default async function SourcesPage() {
  const sources = await getSources();

  const sorted = [...sources].sort((a, b) => {
    const order = (s: SourceRecord) => {
      if (s.jurisdiction_type === "national") return 0;
      if (s.jurisdiction_type === "prefecture") {
        return (PREFECTURE_CODES[s.jurisdiction_name] ?? 999) * 10;
      }
      return (PREFECTURE_CODES[s.parent_prefecture ?? ""] ?? 999) * 10 + 1;
    };
    return order(a) - order(b);
  });

  return (
    <div
      className="container"
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: 16,
        paddingBottom: 32,
      }}
    >
      <header style={{ margin: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h1 className="search-title" style={{ margin: 0 }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              🌿 絶滅危惧種横断検索
            </Link>
          </h1>
        </div>
        <h2
          style={{
            color: "var(--text-heading)",
            marginBottom: "8px",
            fontSize: "var(--fs-base)",
          }}
        >
          📚 データ出典一覧
        </h2>
        <p style={{ color: "var(--text-body)", fontSize: "var(--fs-xs)" }}>
          本サイトが使用しているレッドリストの出典情報です。
        </p>
      </header>

      <table
        className="sources-table"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead className="sources-thead">
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
            <tr
              key={s.id}
              className={`sources-row${s.jurisdiction_type === "municipality" ? " sources-row--muni" : ""}`}
              style={{
                borderBottom: "1px solid var(--border)",
                background:
                  s.jurisdiction_type === "municipality"
                    ? "var(--bg-subtle, var(--bg-table-header))"
                    : undefined,
              }}
            >
              <td className="sources-cell sources-cell--name" style={tdStyle}>
                {s.jurisdiction_type === "municipality" && (
                  <span className="sources-muni-indent" />
                )}
                <span className="sources-name-text">{s.jurisdiction_name}</span>
                <span className="sources-year-sp">
                  {s.publication_year ?? "—"}
                </span>
              </td>
              <td className="sources-cell sources-cell--title" style={tdStyle}>
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
              <td
                className="sources-cell sources-cell--year"
                style={{ ...tdStyle, textAlign: "left" }}
              >
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
  padding: "8px 4px",
  textAlign: "left",
  color: "var(--text-heading)",
  fontWeight: 600,
  fontSize: "var(--fs-sm)",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 4px",
  color: "var(--text-body)",
  fontSize: "var(--fs-sm)",
  textAlign: "left",
};
