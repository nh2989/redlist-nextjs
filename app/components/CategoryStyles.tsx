"use client";

import { CATEGORY_COLORS, CATEGORY_TEXT_COLORS } from "@/lib/categoryConstants";

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

      --color-cat-ex-text:   ${CATEGORY_TEXT_COLORS.EX};
      --color-cat-ew-text:   ${CATEGORY_TEXT_COLORS.EW};
      --color-cat-cr-text:   ${CATEGORY_TEXT_COLORS.CR};
      --color-cat-en-text:   ${CATEGORY_TEXT_COLORS.EN};
      --color-cat-cren-text: ${CATEGORY_TEXT_COLORS.CREN};
      --color-cat-vu-text:   ${CATEGORY_TEXT_COLORS.VU};
      --color-cat-nt-text:   ${CATEGORY_TEXT_COLORS.NT};
      --color-cat-dd-text:   ${CATEGORY_TEXT_COLORS.DD};
      --color-cat-other-text:${CATEGORY_TEXT_COLORS.OTHER};
    }
  `;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
