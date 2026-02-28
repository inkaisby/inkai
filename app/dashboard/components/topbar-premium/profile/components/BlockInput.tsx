"use client";

import React from "react";
import clsx from "clsx";

interface Props {
  label: string;
  value: string;
  onChange?: (v: string) => void;

  type?: string;
  placeholder?: string;

  error?: boolean;
  helperText?: string; // ✅ TAMBAHAN

  dataField?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export default function BlockInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error = false,
  helperText,
  dataField,
  disabled = false,
  readOnly = false,
}: Props) {
  return (
    <div className="space-y-1">
      <label className="text-cyan-300 text-sm">{label}</label>

      <input
        data-field={dataField}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(e) => {
          if (disabled || readOnly || !onChange) return;
          onChange(e.target.value);
        }}
        className={clsx(
          "w-full min-h-[48px] px-3 py-2 rounded outline-none transition touch-manipulation",
          disabled || readOnly
            ? "bg-[#0b1520]/60 border border-cyan-800/30 text-cyan-400 cursor-not-allowed"
            : "bg-[#0b1520] border border-cyan-700/40 text-cyan-200",
          error && !disabled && "border-red-500/70 text-red-300",
        )}
      />

      {/* ===== HELPER TEXT ===== */}
      {helperText && (
        <div
          className={clsx(
            "text-[11px] pl-1",
            error ? "text-red-400" : "text-cyan-400",
          )}
        >
          {helperText}
        </div>
      )}
    </div>
  );
}
