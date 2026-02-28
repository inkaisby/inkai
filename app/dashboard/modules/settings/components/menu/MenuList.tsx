"use client";

import { useMemo, useState, useEffect } from "react";
import { useMenuCRUD, MenuRow } from "./useMenuCRUD";
import MenuForm from "./MenuForm";
import MenuDetailPanel from "./MenuDetailPanel";
import JarvisLoader from "@/components/JarvisLoader";

const PAGE_SIZE = 10;

export default function MenuList() {
  const {
    menus,
    loading,
    error,
    isSuperadmin,
    createMenu,
    updateMenu,
    deleteMenu,
  } = useMenuCRUD();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuRow | undefined>();
  const [detail, setDetail] = useState<MenuRow | null>(null);
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState(false);

  // ✅ Reset page setiap data berubah
  useEffect(() => {
    setPage(1);
  }, [menus]);

  const totalPages = Math.max(1, Math.ceil(menus.length / PAGE_SIZE));

  const pageData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return menus.slice(start, start + PAGE_SIZE);
  }, [menus, page]);

  async function handleSubmit(payload: Partial<MenuRow>) {
    try {
      setProcessing(true);

      if (editing) {
        await updateMenu(editing.id, payload);
      } else {
        await createMenu(payload);
      }

      setOpen(false);
      setEditing(undefined);
    } catch (err: any) {
      alert(err.message ?? "Terjadi kesalahan");
    } finally {
      setProcessing(false);
    }
  }
  async function handleDelete(id: string) {
    try {
      setProcessing(true);
      await deleteMenu(id);
    } catch (err: any) {
      alert(err.message ?? "Gagal hapus");
    } finally {
      setProcessing(false);
    }
  }

  if (loading || isSuperadmin === null) {
    return <JarvisLoader label="Memuat menu…" />;
  }

  if (error) {
    return <div className="p-4 text-sm text-red-400">{error}</div>;
  }

  if (!isSuperadmin) {
    return (
      <div className="p-4 text-sm text-yellow-400">
        Akses menu hanya untuk Superadmin
      </div>
    );
  }

  return (
    <>
      {processing && <JarvisLoader label="Memproses..." />}

      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-white/50">
            Total: {menus.length} menu
          </div>

          <button
            onClick={() => {
              setEditing(undefined);
              setOpen(true);
            }}
            className="px-3 py-1 text-sm bg-emerald-600 rounded"
          >
            + Tambah Menu
          </button>
        </div>

        {/* Table */}
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0b1220] border-b border-white/10">
                <tr className="text-left text-white/60">
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Akses</th>
                  <th className="px-3 py-2 w-[120px]">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {pageData.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setDetail(m)}
                    className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-3 py-2 font-medium">{m.name}</td>
                    <td className="px-3 py-2 text-xs text-white/50">{m.key}</td>
                    <td className="px-3 py-2">{m.order_index}</td>

                    <td className="px-3 py-2">
                      {m.is_active ? (
                        <span className="text-emerald-400">Aktif</span>
                      ) : (
                        <span className="text-red-400">Nonaktif</span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-xs">
                      {m.superadmin_only
                        ? "SUPERADMIN"
                        : m.required_structural_level
                          ? `STRUKTURAL ≥ ${m.required_structural_level}`
                          : m.required_functional_role
                            ? `FUNGSIONAL: ${m.required_functional_role}`
                            : "PUBLIC"}
                    </td>

                    <td
                      className="px-3 py-2 flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setEditing(m);
                          setOpen(true);
                        }}
                        className="px-2 py-1 text-xs border border-white/10 rounded"
                      >
                        Edit
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            await deleteMenu(m.id);
                          } catch (err: any) {
                            alert(err.message ?? "Gagal hapus");
                          }
                        }}
                        className="px-2 py-1 text-xs border border-red-500/40 text-red-400 rounded"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}

                {pageData.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-white/40"
                    >
                      Tidak ada data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center text-sm">
          <div className="text-white/40">
            Halaman {page} / {totalPages}
          </div>

          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 border border-white/10 rounded disabled:opacity-40"
            >
              Prev
            </button>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 border border-white/10 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        <MenuForm
          open={open}
          onClose={() => {
            setOpen(false);
            setEditing(undefined);
          }}
          initial={editing}
          onSubmit={handleSubmit}
        />

        {detail && (
          <MenuDetailPanel data={detail} onClose={() => setDetail(null)} />
        )}
      </div>
    </>
  );
}
