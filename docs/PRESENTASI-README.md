# Presentasi inkai-app

Materi presentasi ada di **`presentasi-inkai-app.md`** (format [Marp](https://marp.app/)).

**Penting:** Presentasi ini harus tetap mengikuti perubahan di aplikasi. Setiap ada **modul baru**, **modul dihapus/rename**, atau **perubahan fitur utama** di `app/dashboard/modules/`, file presentasi harus diperbarui. Aturan ini tercatat di `.cursor/rules/inkai-app.mdc` agar Cursor/agent ikut memperbarui presentasi saat mengubah modul.

## Cara dapat file PowerPoint (.pptx)

### Opsi 1: Marp for VS Code (disarankan)

1. Install ekstensi **"Marp for VS Code"** di Cursor/VS Code:
   - **Link:** [Marp for VS Code – Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode)
   - Atau di Cursor: panel **Extensions** (Ctrl+Shift+X) → cari **"Marp"** → pilih **Marp for VS Code** (publisher: Marp) → Install.
2. Buka file `docs/presentasi-inkai-app.md`.
3. **Export ke PowerPoint** (ikon Marp di kanan atas kadang tidak muncul di Cursor — pakai cara ini):
   - Tekan **Ctrl+Shift+P** (Windows/Linux) atau **Cmd+Shift+P** (Mac) untuk membuka Command Palette.
   - Ketik **Marp** atau **Export Slide Deck**.
   - Pilih **"Marp: Export Slide Deck To Selected Format ..."** atau **"Marp: Export Slide Deck As ..."**.
   - Pilih format **PowerPoint (.pptx)** dan tentukan lokasi simpan.

### Opsi 2: Marp CLI

```bash
npx @marp-team/marp-cli@latest docs/presentasi-inkai-app.md --pptx -o docs/presentasi-inkai-app.pptx
```

File akan tersimpan di `docs/presentasi-inkai-app.pptx`.

### Opsi 3: Salin ke PowerPoint manual

Buka `presentasi-inkai-app.md`. Setiap slide dipisahkan oleh `---`. Anda bisa menyalin judul dan poin per slide ke slide PowerPoint satu per satu.

---

**Isi presentasi:** ringkasan inkai-app (tech stack, arsitektur, modul, RBAC, Settings, wilayah, alur pengguna, dev & dokumentasi).
