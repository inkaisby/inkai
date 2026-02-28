"use client";

import Link from "next/link";
import {
  Users,
  UserCheck,
  Trophy,
  Calendar,
  GraduationCap,
  CreditCard,
  ClipboardList,
  BarChart3,
  Settings,
} from "lucide-react";

const stats = [
  {
    label: "Total Siswa",
    value: "—",
    href: "/dashboard/siswa",
    color: "from-cyan-500/90 to-cyan-700/90",
    borderColor: "border-cyan-500/30",
    icon: Users,
  },
  {
    label: "Anggota Aktif",
    value: "—",
    href: "/dashboard/keanggotaan",
    color: "from-emerald-500/90 to-emerald-700/90",
    borderColor: "border-emerald-500/30",
    icon: UserCheck,
  },
  {
    label: "Event Aktif",
    value: "—",
    href: "/dashboard/event",
    color: "from-amber-500/90 to-amber-700/90",
    borderColor: "border-amber-500/30",
    icon: Trophy,
  },
  {
    label: "Jadwal Terdekat",
    value: "—",
    href: "/dashboard/jadwal",
    color: "from-violet-500/90 to-violet-700/90",
    borderColor: "border-violet-500/30",
    icon: Calendar,
  },
];

const modules = [
  {
    title: "Manajemen Siswa",
    desc: "Data siswa, status, wilayah, kartu digital",
    href: "/dashboard/siswa",
    color: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
    icon: GraduationCap,
  },
  {
    title: "Keanggotaan",
    desc: "Kyu, Dan, mutasi, kartu anggota",
    href: "/dashboard/keanggotaan",
    color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
    icon: UserCheck,
  },
  {
    title: "Absensi",
    desc: "Harian & rekap kehadiran",
    href: "/dashboard/absensi",
    color: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
    icon: ClipboardList,
  },
  {
    title: "Event & Ujian",
    desc: "Gashuku, kejuaraan, ujian",
    href: "/dashboard/event",
    color: "bg-amber-500/20 border-amber-500/40 text-amber-300",
    icon: Trophy,
  },
  {
    title: "Keuangan",
    desc: "Iuran & transaksi",
    href: "/dashboard/keuangan",
    color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
    icon: CreditCard,
  },
  {
    title: "Penilaian",
    desc: "Nilai teknik & fisik",
    href: "/dashboard/penilaian",
    color: "bg-violet-500/20 border-violet-500/40 text-violet-300",
    icon: BarChart3,
  },
  {
    title: "Pengguna",
    desc: "User, role, permission",
    href: "/dashboard/user",
    color: "bg-rose-500/20 border-rose-500/40 text-rose-300",
    icon: Users,
  },
  {
    title: "Pengaturan",
    desc: "Sistem & keamanan",
    href: "/dashboard/settings",
    color: "bg-slate-500/20 border-slate-500/40 text-slate-300",
    icon: Settings,
  },
];

export default function DashboardHome() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-cyan-200 tracking-wide">
          Dashboard
        </h1>
        <p className="text-sm text-cyan-400/70 mt-1">
          Ringkasan & akses cepat sistem manajemen dojo
        </p>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className={`group block rounded-xl p-5 border bg-gradient-to-br ${s.color} ${s.borderColor} hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] transition-all duration-300 no-underline`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/80">{s.label}</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {s.value}
                  </div>
                </div>
                <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                  <Icon size={28} strokeWidth={1.5} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Menu Modul */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.title}
              href={m.href}
              className="flex items-center gap-4 rounded-xl border border-cyan-500/20 bg-[#0a0f14]/60 p-5 hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.08)] transition-all duration-300 no-underline"
            >
              <div
                className={`h-12 w-12 flex items-center justify-center rounded-lg border ${m.color}`}
              >
                <Icon size={24} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-cyan-100">{m.title}</div>
                <div className="text-sm text-cyan-400/70 mt-0.5">{m.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="rounded-xl border border-cyan-500/20 bg-[#0a0f14]/40 p-4 text-sm text-cyan-400/70">
        Tampilan dashboard — fokus ringkas, visual jelas, dan akses cepat ke
        seluruh modul.
      </div>
    </div>
  );
}
