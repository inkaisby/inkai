"use client";

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200000] bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div
        className="w-full max-w-sm rounded-t-xl sm:rounded-xl p-5
        bg-[#0e0e0e] border border-cyan-500/30
        shadow-[0_0_30px_-10px_rgba(0,255,255,0.5)]
      "
      >
        <h3 className="text-cyan-300 mb-2">{title}</h3>
        <p className="text-sm text-white/70 mb-4">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2 text-white/50 hover:text-white rounded-lg"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="min-h-[44px] px-4 py-2 bg-cyan-600 text-black rounded-lg font-medium"
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}
