/**
 * Hapus folder .next agar tidak bentrok antara build Webpack dan Turbopack.
 * Dijalankan sebelum dev:turbo atau saat ganti mode dev.
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", ".next");
try {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("Folder .next telah dihapus.");
  }
} catch (e) {
  console.warn("Peringatan: tidak bisa hapus .next:", e.message);
  process.exitCode = 1;
}
