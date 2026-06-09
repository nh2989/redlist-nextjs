"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/search") return null;

  return (
    <footer style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      textAlign: "center",
      padding: "8px",
      fontSize: "var(--fs-sm)",
      color: "var(--text-faint)",
      background: "var(--bg-page)",
      borderTop: "1px solid var(--border)",
    }}>
      © 2026 Hiroshi Noda
    </footer>
  );
}