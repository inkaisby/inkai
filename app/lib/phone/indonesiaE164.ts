/**
 * Normalisasi nomor Indonesia ke digit E.164 tanpa + (62xxxxxxxxxx).
 * Menerima: 081234567890, 81234567890, 6281234567890
 */
export function normalizeIndonesiaPhoneToE164Digits(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.length < 10 || d.length > 15) return null;
  if (d.startsWith("62")) {
    if (d.length < 11) return null;
    return d;
  }
  if (d.startsWith("0")) return "62" + d.slice(1);
  if (d.startsWith("8")) return "62" + d;
  return null;
}
