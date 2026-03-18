/** Digit saja, maks. 15 (cukup untuk rupiah). */
export function rupiahDigitsOnly(input: string): string {
  return input.replace(/\D/g, "").slice(0, 15);
}

/** "200000" → "Rp 200.000" */
export function formatRupiahFromDigits(digits: string): string {
  if (!digits) return "";
  const trimmed = digits.replace(/^0+/, "") || "0";
  try {
    const num = BigInt(trimmed);
    return `Rp ${num.toLocaleString("id-ID")}`;
  } catch {
    return "";
  }
}

export function digitsFromPriceString(s: string): string {
  return s.replace(/\D/g, "");
}

/** Normalisasi tampilan harga tersimpan (mis. "200000" atau "Rp 200.000"). */
export function displayRupiah(stored: string | null | undefined): string {
  if (stored == null || !String(stored).trim()) return "—";
  const d = digitsFromPriceString(stored);
  if (!d) return String(stored).trim();
  return formatRupiahFromDigits(d);
}
