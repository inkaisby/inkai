"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/app/lib/utils";

export type SearchableSelectOption = { value: string; label: string };

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  /** Jarak minimal lebar dropdown (default 220px) */
  minWidth?: string;
  disabled?: boolean;
}

/**
 * Dropdown dengan search, tema gelap, highlight halus (tidak mencolok).
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "— Pilih —",
  className,
  triggerClassName,
  minWidth = "min-w-[220px]",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedLabel = value ? options.find((o) => o.value === value)?.label ?? value : null;

  const filtered = React.useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase().trim();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  React.useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const handleSelect = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-[42px] w-full items-center justify-between rounded border border-white/10 bg-black/40 px-3 py-2 text-left text-sm text-zinc-200",
          "hover:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          minWidth,
          triggerClassName
        )}
      >
        <span className={cn("truncate", !selectedLabel && "text-zinc-500")}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDownIcon
          className={cn("h-4 w-4 shrink-0 opacity-60 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full left-0 z-50 mt-1 max-h-[280px] overflow-hidden rounded border border-white/10 bg-zinc-900 shadow-lg",
            minWidth
          )}
        >
          <div className="border-b border-white/10 p-1.5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari..."
              className={cn(
                "w-full rounded bg-white/5 px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500",
                "border-0 outline-none focus:ring-1 focus:ring-white/20"
              )}
            />
          </div>
          <ul className="max-h-[220px] overflow-y-auto p-1">
            <li>
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={cn(
                  "w-full rounded px-2.5 py-2 text-left text-sm",
                  !value
                    ? "bg-white/10 text-zinc-100"
                    : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
                )}
              >
                {placeholder}
              </button>
            </li>
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => handleSelect(o.value)}
                  className={cn(
                    "w-full rounded px-2.5 py-2 text-left text-sm text-zinc-200",
                    "hover:bg-white/10 hover:text-zinc-100",
                    value === o.value ? "bg-white/10 text-zinc-100" : ""
                  )}
                >
                  {o.label}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-2.5 py-2 text-sm text-zinc-500">Tidak ada hasil</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
