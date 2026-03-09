import { Suspense } from "react";
import KwitansiRantingClient from "./KwitansiRantingClient";

export const dynamic = "force-dynamic";

export default function KwitansiRantingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white p-8 text-center text-slate-600">
          Memuat kwitansi…
        </div>
      }
    >
      <KwitansiRantingClient />
    </Suspense>
  );
}
