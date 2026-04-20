"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/sources") return null;

  return (
    <footer>
      <p style={{ fontSize: "var(--fs-sm" }}>
        データ出典：環境省・都道府県・市町村レッドリスト
      </p>
      <p style={{ marginTop: "4px" }}>
        <Link
          href="/sources"
          style={{
            color: "white",
            textDecoration: "underline",
            fontSize: "var(--fs-sm)",
          }}
        >
          出典一覧
        </Link>
      </p>
    </footer>
  );
}
