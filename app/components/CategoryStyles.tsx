"use client";

import { CATEGORY_COLORS } from "@/lib/categoryConstants";

export default function CategoryStyles() {
  const css = `
    :root {
      --color-cat-ex:    ${CATEGORY_COLORS.EX};
      --color-cat-ew:    ${CATEGORY_COLORS.EW};
      --color-cat-cr:    ${CATEGORY_COLORS.CR};
      --color-cat-en:    ${CATEGORY_COLORS.EN};
      --color-cat-cren:  ${CATEGORY_COLORS.CREN};
      --color-cat-vu:    ${CATEGORY_COLORS.VU};
      --color-cat-nt:    ${CATEGORY_COLORS.NT};
      --color-cat-dd:    ${CATEGORY_COLORS.DD};
      --color-cat-other: ${CATEGORY_COLORS.OTHER};
      --color-cat-none:  ${CATEGORY_COLORS.NONE};
    }
  `;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
