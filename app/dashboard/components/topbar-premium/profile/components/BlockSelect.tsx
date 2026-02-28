"use client";

import React from "react";
import clsx from "clsx";

interface BlockSelectProps {
  label: string;
  value: string | undefined;
  onChange?: (v: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder?: string;
  error?: boolean | string;
  disabled?: boolean;
  dataField?: string;
}

export default function BlockSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Pilih...",
  error,
  disabled = false,
  dataField,
}: BlockSelectProps) {
  return (
    <div className="w-full">
      <label className="block text-sm text-cyan-300 mb-1">{label}</label>

      <select
        value={value ?? ""}
        disabled={disabled}
        data-field={dataField}
        onChange={(e) => {
          if (disabled || !onChange) return;
          onChange(e.target.value);
        }}
        className={clsx(
          "w-full min-h-[48px] px-4 py-3 rounded-lg bg-[#0d1218] border outline-none text-cyan-100 cursor-pointer",
          "border-cyan-700/40 focus:border-cyan-300",
          "focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition",
          "touch-manipulation", // kurangi delay tap di mobile
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-red-400 text-red-300"
        )}
      >
        <option value="">{placeholder}</option>

        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && typeof error === "string" && (
        <p className="text-xs text-red-400 mt-1 opacity-80">{error}</p>
      )}
    </div>
  );
}
