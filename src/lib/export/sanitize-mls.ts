/**
 * Sanitizes text for MLS system compatibility.
 * Strips smart quotes, em/en dashes, emoji, zero-width chars, and normalizes whitespace.
 * Only used for MLS card copy — other platforms handle Unicode fine.
 */
export function sanitizeMlsText(text: string): string {
  let result = text;

  // Smart quotes → straight quotes
  result = result.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  result = result.replace(/[\u2018\u2019\u201A\u201B]/g, "'");

  // Em dash / en dash → hyphen
  result = result.replace(/[\u2014\u2013]/g, '-');

  // Ellipsis character → three dots
  result = result.replace(/\u2026/g, '...');

  // Strip emoji (Unicode emoji ranges)
  result = result.replace(/[\u{1F600}-\u{1F64F}]/gu, '');  // Emoticons
  result = result.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');  // Misc symbols & pictographs
  result = result.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');  // Transport & map
  result = result.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');  // Flags
  result = result.replace(/[\u{2600}-\u{26FF}]/gu, '');     // Misc symbols
  result = result.replace(/[\u{2700}-\u{27BF}]/gu, '');     // Dingbats
  result = result.replace(/[\u{FE00}-\u{FE0F}]/gu, '');     // Variation selectors
  result = result.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');   // Supplemental symbols
  result = result.replace(/[\u{1FA00}-\u{1FA6F}]/gu, '');   // Chess symbols
  result = result.replace(/[\u{1FA70}-\u{1FAFF}]/gu, '');   // Symbols extended-A
  result = result.replace(/[\u{200D}]/gu, '');               // Zero-width joiner (emoji combiner)

  // Strip zero-width characters and BOM
  result = result.replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, '');

  // Normalize whitespace
  result = result.replace(/[ \t]+/g, ' ');          // Collapse horizontal whitespace
  result = result.replace(/\n{3,}/g, '\n\n');       // Max two consecutive newlines
  result = result.replace(/[ \t]+$/gm, '');         // Trailing whitespace per line
  result = result.trim();

  return result;
}
