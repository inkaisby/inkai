import { Suspense } from "react";
import KwitansiClient from "./KwitansiClient";

export const dynamic = "force-dynamic";

export default function KwitansiPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white p-8 text-center text-slate-600">
          Memuat kwitansi…
        </div>
      }
    >
      <KwitansiClient />
    </Suspense>
  );
}
