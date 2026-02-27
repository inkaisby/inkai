"use client";

import { useEffect, useState } from "react";

export function StudentFilters() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <input
      placeholder="Cari siswa..."
      className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800 text-sm"
    />
  );
}
