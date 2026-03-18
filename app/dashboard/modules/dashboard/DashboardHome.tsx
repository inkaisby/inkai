"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Trophy,
  Instagram,
  ShoppingBag,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  AlertTriangle,
  Pencil,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";
import { useBootstrapStore } from "@/app/dashboard/store/bootstrapStore";
import { displayRupiah } from "@/app/lib/formatRupiah";
import {
  MARKETPLACE_IMAGE_MAX_EDGE_PX,
  formatImageSizeLabel,
  MARKETPLACE_IMAGE_MAX_BYTES,
} from "@/app/lib/marketplaceImageUpload";
import { uploadPreparedImage } from "@/app/lib/client/uploadPreparedImage";

/* ================= TYPES ================= */
type RantingItem = {
  id: string;
  nama: string;
  aktif?: boolean;
  province_id?: number | null;
  regency_id?: number | null;
  district_id?: number | null;
  instagram_url?: string | null;
};

type FeedPost = {
  id: string;
  title: string;
  body: string;
  image?: string | null;
  date: string;
  likes: number;
  type: "event" | "pengumuman" | "dojo";
  liked?: boolean;
};

type FeedComment = {
  id: string;
  feed_id: string;
  user_id: string | null;
  author_name: string | null;
  body: string;
  created_at: string;
  mine: boolean;
};

type MarketplaceItem = {
  id: string;
  title: string;
  price: string;
  image?: string | null;
  href: string;
  description?: string | null;
  category?: string | null;
};

type InstagramFeedItem = {
  id: string;
  image_url: string;
  caption: string;
  post_url: string;
};

function getDashboardScrollEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>("main.dashboard-main-scroll");
}

function scrollDashboardTo(top: number) {
  const el = getDashboardScrollEl();
  if (el) {
    el.scrollTo({ top, behavior: "smooth" });
  } else {
    window.scrollTo({ top, behavior: "smooth" });
  }
}

/** Format created_at ke relatif (2 jam, 1 hari, 2 hari) atau tanggal */
function formatFeedDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffM < 60) return diffM <= 1 ? "Baru saja" : `${diffM} menit`;
  if (diffH < 24) return diffH <= 1 ? "1 jam" : `${diffH} jam`;
  if (diffD < 7) return diffD <= 1 ? "1 hari" : `${diffD} hari`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/* Palet utama: teal/cyan + amber — elegan, tidak norak */
const storyAccents = ["teal", "amber", "slate"] as const;

/* ================= STATS & MODULES ================= */
const stats = [
  { label: "Event Aktif", value: "—", href: "/dashboard/event", accent: "amber", icon: Trophy },
];

const accentStyles: Record<string, { card: string; border: string; text: string; icon: string }> = {
  amber: { card: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-200", icon: "text-amber-400" },
  slate: { card: "bg-slate-500/10", border: "border-slate-500/25", text: "text-slate-200", icon: "text-slate-400" },
};

const feedPostStyles: Record<FeedPost["type"], { leftBar: string; placeholder: string }> = {
  event: { leftBar: "bg-amber-500/60", placeholder: "from-amber-950/50 to-transparent" },
  pengumuman: { leftBar: "bg-teal-500/60", placeholder: "from-teal-950/50 to-transparent" },
  dojo: { leftBar: "bg-emerald-500/60", placeholder: "from-emerald-950/50 to-transparent" },
};

/* ================= COMPONENT ================= */
/** Statistik & Akses Cepat Modul untuk: superadmin, ketua per wilayah (scope), atau user level 2+ (Ketua Ranting ke atas). */
function useShowAdminDashboard() {
  const { scope, app_role, loading } = useScope();
  const { data: bootstrap } = useBootstrapStore();
  const user = bootstrap?.user ?? null;

  const isSuperadmin = (app_role ?? "").toUpperCase() === "SUPERADMIN";
  const isKetuaWilayah =
    scope != null &&
    (scope.is_pp ||
      (scope.ranting_ids?.length ?? 0) > 0 ||
      (scope.cabang_ids?.length ?? 0) > 0 ||
      (scope.provinsi_ids?.length ?? 0) > 0);

  const fromRoles = user?.structural_roles?.filter((r) => r.active).map((r) => r.structural_level) ?? [];
  const fromProfile = user?.profile_structural_level != null ? [user.profile_structural_level] : [];
  const allLevels = [...fromRoles, ...fromProfile];
  const maxLevel = allLevels.length ? Math.max(...allLevels) : 0;
  const isLevel2Plus = maxLevel >= 2;

  return !loading && (isSuperadmin || isKetuaWilayah || isLevel2Plus);
}

export default function DashboardHome() {
  const [rantingList, setRantingList] = useState<RantingItem[]>([]);
  const [rantingLoading, setRantingLoading] = useState(true);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, FeedComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>([]);
  const [instagramFeed, setInstagramFeed] = useState<InstagramFeedItem[]>([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const showAdminDashboard = useShowAdminDashboard();
  const [showDocNotice, setShowDocNotice] = useState(false);
  const hideDocNoticeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: bootstrap } = useBootstrapStore();
  const currentUserId = bootstrap?.user?.id ?? null;

  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [editingImage, setEditingImage] = useState("");
  const [uploadImageLoading, setUploadImageLoading] = useState(false);
  const [uploadImageError, setUploadImageError] = useState<string | null>(null);
  const [editingSaving, setEditingSaving] = useState(false);
  const [editingError, setEditingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/home", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { feed: [], marketplace: [] }))
      .then((data: {
        feed?: Array<{
          id: string;
          title: string;
          body: string;
          image: string | null;
          date: string;
          likes: number;
          type: FeedPost["type"];
          liked?: boolean;
        }>;
        marketplace?: MarketplaceItem[];
        instagramFeed?: InstagramFeedItem[];
      }) => {
        if (cancelled) return;
        const feedList = Array.isArray(data.feed) ? data.feed : [];
        setFeed(
          feedList.map((r) => ({
            id: r.id,
            title: r.title,
            body: r.body,
            image: r.image ?? null,
            date: formatFeedDate(r.date),
            likes: r.likes ?? 0,
            type: r.type,
            liked: Boolean(r.liked),
          })),
        );
        setLikedPosts(
          feedList.reduce<Record<string, boolean>>((acc, r) => {
            if (r.liked) acc[r.id] = true;
            return acc;
          }, {}),
        );
        setMarketplace(
          Array.isArray(data.marketplace)
            ? data.marketplace.map((m) => ({
                id: m.id,
                title: m.title,
                price: m.price,
                image: m.image ?? null,
                href: m.href,
                description: m.description ?? null,
                category: m.category ?? null,
              }))
            : [],
        );
        setInstagramFeed(Array.isArray(data.instagramFeed) ? data.instagramFeed : []);
      })
      .catch(() => {
        if (!cancelled) setFeed([]);
        if (!cancelled) setMarketplace([]);
        if (!cancelled) setInstagramFeed([]);
      })
      .finally(() => {
        if (!cancelled) setHomeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadComments = async (postId: string) => {
    if (commentsLoading[postId]) return;
    setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/home/comments?feedId=${encodeURIComponent(postId)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        return;
      }
      const json = (await res
        .json()
        .catch(() => ({}))) as {
        items?: Array<{
          id: string;
          feed_id: string;
          user_id: string | null;
          author_name: string | null;
          body: string;
          created_at: string;
        }>;
      };
      const items = Array.isArray(json?.items) ? json.items : [];
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: items.map((c) => ({
          id: c.id,
          feed_id: c.feed_id,
          user_id: c.user_id ?? null,
          author_name: c.author_name ?? null,
          body: c.body ?? "",
          created_at: c.created_at ?? "",
          mine: currentUserId != null && c.user_id === currentUserId,
        })),
      }));
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleSubmitComment = async (postId: string) => {
    const text = (commentInput[postId] ?? "").trim();
    if (!text) return;

    setCommentInput((prev) => ({ ...prev, [postId]: "" }));

    try {
      const res = await fetch("/api/home/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feedId: postId, text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.item) {
        // fallback: kembalikan teks ke input bila gagal
        setCommentInput((prev) => ({ ...prev, [postId]: text }));
        return;
      }
      const c = json.item as {
        id: string;
        feed_id: string;
        user_id: string | null;
        author_name: string | null;
        body: string;
        created_at: string;
      };
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [
          ...(prev[postId] ?? []),
          {
            id: c.id,
            feed_id: c.feed_id,
            user_id: c.user_id ?? null,
            author_name: c.author_name ?? null,
            body: c.body ?? "",
            created_at: c.created_at ?? "",
            mine: true,
          },
        ],
      }));
    } catch {
      setCommentInput((prev) => ({ ...prev, [postId]: text }));
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      const res = await fetch("/api/home/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: postId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof json?.message === "string"
            ? json.message
            : res.status === 401
              ? "Silakan login ulang untuk menyukai postingan."
              : "Like gagal. Coba lagi.";
        toast.error(msg);
        return;
      }

      const nextLikes = typeof json?.likes === "number" ? json.likes : null;
      const delta = typeof json?.delta === "number" ? json.delta : 0;

      if (nextLikes != null) {
        setFeed((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes: nextLikes,
                }
              : p,
          ),
        );
      } else if (delta !== 0) {
        setFeed((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes: Math.max(0, p.likes + delta),
                }
              : p,
          ),
        );
      }

      setLikedPosts((prev) => ({ ...prev, [postId]: delta > 0 ? true : false }));
    } catch {
      toast.error("Jaringan bermasalah. Coba lagi.");
    }
  };

  const handleShare = async (postId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#post-${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "INKAI Feed", text: "Lihat postingan INKAI", url });
        return;
      }
    } catch {
      // fallback ke copy clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      alert("Tautan disalin ke clipboard.");
    } catch {
      alert("Tidak bisa menyalin tautan, silakan salin manual.");
    }
  };

  // Soft notif: dokumen profil belum lengkap (KTP / Akte Lahir / KK)
  useEffect(() => {
    let cancelled = false;

    type MeProfile = {
      ktp_path?: string | null;
      akta_lahir_path?: string | null;
      kk_path?: string | null;
    };
    type MeResponse = { profile?: MeProfile | null };

    fetch("/api/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MeResponse | null) => {
        if (cancelled || !data?.profile) return;
        const profile: MeProfile = data.profile ?? {};
        const missing = [
          profile.ktp_path ? null : "KTP",
          profile.akta_lahir_path ? null : "Akte Lahir",
          profile.kk_path ? null : "Kartu Keluarga",
        ].filter(Boolean);
        if (missing.length > 0) {
          setShowDocNotice(true);
          if (hideDocNoticeRef.current) {
            clearTimeout(hideDocNoticeRef.current);
          }
          hideDocNoticeRef.current = setTimeout(() => {
            setShowDocNotice(false);
          }, 20000);
        }
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
      if (hideDocNoticeRef.current) {
        clearTimeout(hideDocNoticeRef.current);
        hideDocNoticeRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ranting", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return [];
        try {
          const text = await res.text();
          return text.trim() ? (JSON.parse(text) as RantingItem[]) : [];
        } catch {
          return [];
        }
      })
      .then((data: RantingItem[]) => {
        if (!cancelled && Array.isArray(data)) setRantingList(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRantingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Link Instagram per ranting: pakai instagram_url dari DB, fallback ke default */
  const getInstagramUrl = (ranting: RantingItem) => {
    const url = ranting?.instagram_url?.trim();
    if (url) return url;
    return typeof process.env.NEXT_PUBLIC_INSTAGRAM_BASE_URL !== "undefined"
      ? process.env.NEXT_PUBLIC_INSTAGRAM_BASE_URL
      : "https://instagram.com";
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-6 sm:pb-8">
      {/* Header — elegan, satu aksen */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-wide">
          Home
        </h1>
        <p className="text-sm text-white/60 mt-1">
          Ringkasan, feed, Instagram per wilayah, dan marketplace
        </p>
      </div>

      {/* Shortcut: Konten Saya */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-white/90">Konten Saya</div>
            <div className="text-xs text-white/60 mt-0.5">
              Buat konten sendiri. Yang bukan pembuat hanya melihat yang publish/aktif.
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/dashboard/konten-saya-berita"
              className="rounded-md bg-white/10 hover:bg-white/15 px-3 py-2 text-sm text-white/90"
            >
              Berita
            </Link>
            <Link
              href="/dashboard/konten-saya-instagram"
              className="rounded-md bg-white/10 hover:bg-white/15 px-3 py-2 text-sm text-white/90"
            >
              Instagram
            </Link>
            <Link
              href="/dashboard/marketplace-saya"
              className="rounded-md bg-white/10 hover:bg-white/15 px-3 py-2 text-sm text-white/90"
            >
              Marketplace
            </Link>
          </div>
        </div>
      </div>

      {/* Soft notif: dokumen profil belum lengkap */}
      {showDocNotice && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-100 flex items-start gap-3">
          <div className="mt-0.5">
            <AlertTriangle size={18} className="text-amber-300" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="font-medium text-amber-100">
              Dokumen profil belum lengkap
            </div>
            <p className="text-amber-100/90">
              Unggah scan <span className="font-semibold">KTP, Akte Lahir, dan Kartu Keluarga</span> di
              profil Anda. Pamungkas: <span className="italic">“Jangan tunggu ujian, rapikan administrasi
              dulu.”</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (hideDocNoticeRef.current) {
                clearTimeout(hideDocNoticeRef.current);
                hideDocNoticeRef.current = null;
              }
              setShowDocNotice(false);
            }}
            className="text-[11px] text-amber-100/80 hover:text-amber-50 ml-2"
          >
            Nanti saja
          </button>
        </div>
      )}

      {/* Stories — teal/amber/slate halus, tidak ramai */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-medium text-white/90 mb-3">Stories — Ranting / Dojo</h2>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 -mx-1">
          {rantingLoading ? (
            <div className="flex gap-3 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-[72px] sm:w-16 animate-pulse">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 border border-white/10" />
                  <div className="h-3 mt-2 w-12 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : (
            rantingList.slice(0, 12).map((r, i) => {
              const acc = storyAccents[i % storyAccents.length];
              const ring = acc === "teal" ? "border-teal-400/40" : acc === "amber" ? "border-amber-400/40" : "border-slate-400/40";
              return (
                <a
                  key={r.id}
                  href={getInstagramUrl(r)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 sm:gap-2 no-underline group min-w-[72px] sm:min-w-0"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 ${ring} bg-white/5 flex items-center justify-center text-white/90 font-medium text-base sm:text-lg group-hover:bg-white/10 transition-colors`}>
                    {r.nama?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-[11px] sm:text-xs text-white/70 max-w-[72px] sm:max-w-[64px] truncate text-center px-0.5" title={r.nama}>
                    {r.nama}
                  </span>
                </a>
              );
            })
          )}
          {!rantingLoading && rantingList.length === 0 && (
            <p className="text-sm text-white/50 py-2">Belum ada ranting. Hubungi admin.</p>
          )}
        </div>
      </div>

      {/* Layout: Feed + Sidebar — satu gaya kartu, aksen halus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-sm font-medium text-white/90">Feed</h2>
          <div className="space-y-4">
            {homeLoading ? (
              <p className="text-sm text-white/50">Memuat feed…</p>
            ) : feed.length === 0 ? (
              <p className="text-sm text-white/50">Belum ada feed.</p>
            ) : (
            feed.map((post) => {
              const style = feedPostStyles[post.type];
              return (
                <article
                  key={post.id}
                  id={`post-${post.id}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
                >
                  <div className="flex">
                    <div className={`w-1 flex-shrink-0 ${style.leftBar}`} />
                    <div className="flex-1 min-w-0">
                      <div className="p-4 flex items-center gap-3 border-b border-white/5">
                        <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 text-sm font-medium">
                          INKAI
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white/95">{post.title}</div>
                          <div className="text-xs text-white/50">{post.date}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPost(post);
                            setEditingTitle(post.title);
                            setEditingBody(post.body);
                            setEditingImage(post.image ?? "");
                            setUploadImageError(null);
                            setEditingError(null);
                          }}
                          className="ml-2 inline-flex items-center justify-center rounded-full p-1.5 text-white/40 hover:text-teal-300 hover:bg-teal-500/10 border border-white/10 hover:border-teal-400/40 transition-colors"
                          title="Edit konten ini"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                      {post.image ? (
                        <div className="relative aspect-video overflow-hidden bg-black/30">
                          <Image
                            src={post.image}
                            alt=""
                            fill
                            className="pointer-events-none object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className={`aspect-video bg-gradient-to-br ${style.placeholder} flex items-center justify-center`}>
                          <Trophy className="w-10 h-10 text-white/30" />
                        </div>
                      )}
                      <div className="p-4">
                        <p className="text-sm text-white/80 break-words whitespace-pre-wrap">
                          {post.body}
                        </p>
                        <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleToggleLike(post.id);
                            }}
                            className={`inline-flex min-h-10 min-w-10 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg px-2 py-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white active:bg-white/[0.12] ${
                              likedPosts[post.id] ? "text-rose-400 hover:text-rose-300" : ""
                            }`}
                            aria-label={likedPosts[post.id] ? "Batal suka" : "Suka"}
                          >
                            <Heart size={18} className={likedPosts[post.id] ? "fill-current" : ""} />
                            <span className="tabular-nums">{post.likes}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const el = document.getElementById(`comments-${post.id}`);
                              if (!el) return;
                              el.classList.toggle("hidden");
                              if (!commentsByPost[post.id]) {
                                void loadComments(post.id);
                              }
                            }}
                            className="inline-flex min-h-10 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg px-2 py-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <MessageCircle size={18} />
                            Komentar
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleShare(post.id);
                            }}
                            className="inline-flex min-h-10 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg px-2 py-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <Share2 size={18} />
                            Bagikan
                          </button>
                        </div>
                        <div id={`comments-${post.id}`} className="mt-3 hidden">
                          <div className="rounded-md border border-white/10 bg-black/40 p-3 space-y-3">
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                              {commentsLoading[post.id] && (
                                <p className="text-[11px] text-white/50">Memuat komentar…</p>
                              )}
                              {!commentsLoading[post.id] &&
                                (commentsByPost[post.id] ?? []).map((c) => (
                                  <div
                                    key={c.id}
                                    className="rounded-md bg-white/[0.03] px-2.5 py-2 text-[11px] text-white/80"
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <span className="font-medium text-white/90">
                                        {c.mine ? "Anda" : c.author_name || "Anggota"}
                                      </span>
                                      {c.created_at && (
                                        <span className="text-[10px] text-white/40">
                                          {formatFeedDate(c.created_at)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="whitespace-pre-wrap break-words">{c.body}</p>
                                  </div>
                                ))}
                              {!commentsLoading[post.id] && (!commentsByPost[post.id] || commentsByPost[post.id].length === 0) && (
                                <p className="text-[11px] text-white/50">Belum ada komentar.</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                              <input
                                value={commentInput[post.id] ?? ""}
                                onChange={(e) =>
                                  setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))
                                }
                                className="flex-1 rounded-md bg-black/60 border border-white/15 px-2 py-1.5 text-xs text-white outline-none focus:border-teal-400/60"
                                placeholder="Tulis komentar…"
                              />
                              <button
                                type="button"
                                onClick={() => void handleSubmitComment(post.id)}
                                disabled={!(commentInput[post.id] ?? "").trim()}
                                className="rounded-md bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:hover:bg-teal-600 px-2.5 py-1.5 text-[11px] text-white"
                              >
                                Kirim
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
            )}
          </div>
        </div>

        {/* Sidebar — statistik hanya untuk ketua per wilayah; user biasa tidak lihat */}
        <div className="space-y-6">
          {showAdminDashboard && (
            <div className="grid grid-cols-2 gap-2">
              {stats.map((s) => {
                const Icon = s.icon;
                const st = accentStyles[s.accent] ?? accentStyles.slate;
                return (
                  <Link
                    key={s.label}
                    href={s.href}
                    className={`rounded-lg p-3 border ${st.border} ${st.card} hover:bg-white/[0.06] transition-colors no-underline`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/70">{s.label}</span>
                      <Icon size={16} className={st.icon} />
                    </div>
                    <div className={`text-lg font-semibold ${st.text} mt-0.5`}>{s.value}</div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Feed IG — unggahan Instagram */}
          {instagramFeed.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-sm font-medium text-white/90 flex items-center gap-2 mb-3">
                <Instagram size={16} className="text-white/60" />
                Feed IG
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1">
                {instagramFeed.map((post) => (
                  <a
                    key={post.id}
                    href={post.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-[140px] rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden hover:border-pink-500/30 hover:bg-white/[0.06] transition-colors no-underline block"
                  >
                    <div className="aspect-square relative bg-white/5">
                      <Image
                        src={post.image_url || "https://placehold.co/400x400/1e293b/64748b?text=IG"}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="140px"
                        unoptimized
                      />
                    </div>
                    <p className="p-2 text-[11px] text-white/80 line-clamp-2" title={post.caption}>
                      {post.caption || "—"}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Instagram per wilayah — border halus */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-medium text-white/90 flex items-center gap-2 mb-2">
              <Instagram size={16} className="text-white/60" />
              Instagram per Wilayah
            </h2>
            <p className="text-xs text-white/50 mb-3">
              Akun Instagram ranting/dojo per wilayah.
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {rantingLoading ? (
                <div className="text-xs text-white/40">Memuat...</div>
              ) : (
                rantingList.slice(0, 8).map((r) => (
                  <a
                    key={r.id}
                    href={getInstagramUrl(r)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-transparent hover:border-teal-500/20 transition-colors no-underline text-white/80 text-sm"
                  >
                    <span className="truncate">{r.nama}</span>
                    <ExternalLink size={12} className="flex-shrink-0 text-white/40" />
                  </a>
                ))
              )}
              {!rantingLoading && rantingList.length === 0 && (
                <p className="text-xs text-white/40">Belum ada ranting.</p>
              )}
            </div>
          </div>

          {/* Marketplace — satu gaya, aksen teal & amber */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-medium text-white/90 flex items-center gap-2 mb-2">
              <ShoppingBag size={16} className="text-white/60" />
              Marketplace
            </h2>
            <p className="text-xs text-white/50 mb-3">
              Seragam, sabuk, dan perlengkapan dojo.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {homeLoading ? (
                <p className="text-xs text-white/50 col-span-2">Memuat…</p>
              ) : marketplace.length === 0 ? (
                <p className="text-xs text-white/50 col-span-2">Belum ada item marketplace.</p>
              ) : (
              marketplace.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/marketplace/p/${item.id}`}
                  className="block rounded-lg border border-white/10 bg-white/[0.04] p-2.5 hover:bg-white/[0.07] hover:border-teal-500/20 transition-colors no-underline"
                >
                  <div className="aspect-square rounded bg-white/5 flex items-center justify-center mb-1.5 overflow-hidden relative">
                    {item.image ? (
                      <Image src={item.image} alt={item.title} fill className="object-cover" sizes="120px" unoptimized />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-teal-400/60" />
                    )}
                  </div>
                  {item.category ? (
                    <span className="inline-block mb-0.5 text-[9px] px-1.5 py-0.5 rounded border border-white/15 text-white/50">
                      {item.category}
                    </span>
                  ) : null}
                  <div className="text-xs font-medium text-white/90 truncate">{item.title}</div>
                  {item.description ? (
                    <div className="text-[10px] text-white/45 line-clamp-2 mt-0.5">{item.description}</div>
                  ) : null}
                  <div className="text-xs text-amber-400/90 mt-0.5">{displayRupiah(item.price)}</div>
                  <div className="mt-1 text-[10px] text-teal-300/70">Detail</div>
                </Link>
              ))
              )}
            </div>
            <Link
              href="/dashboard/marketplace"
              className="mt-2.5 block text-center text-xs text-teal-400 hover:text-teal-300 no-underline"
            >
              Lihat semua →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer — minimal */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
        Home — Stories ranting, feed, Instagram per wilayah, dan marketplace.
      </div>

      {/* Modal edit konten feed */}
      {editingPost && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-3 sm:px-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-feed-modal-title"
          onClick={() => !editingSaving && setEditingPost(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-white/15 bg-slate-950/95 shadow-2xl backdrop-blur-md text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <h2
                  id="edit-feed-modal-title"
                  className="text-sm font-semibold text-white/95"
                >
                  Edit Konten Home
                </h2>
                <p className="text-[11px] text-white/50">
                  Perubahan akan memodifikasi konten di modul Konten Saya — Berita.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !editingSaving && setEditingPost(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:bg-white/10"
                aria-label="Tutup"
              >
                <X size={14} />
              </button>
            </div>
            <form
              className="px-4 py-4 sm:px-5 sm:py-5 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const title = editingTitle.trim();
                const body = editingBody.trim();
                if (!title || !body) {
                  setEditingError("Judul dan isi wajib diisi.");
                  return;
                }
                setEditingSaving(true);
                setEditingError(null);
                const imagePath = editingImage.trim() || null;
                try {
                  const res = await fetch(`/api/konten/berita/${editingPost.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, body, image_path: imagePath }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    const msg =
                      typeof json?.message === "string"
                        ? json.message
                        : "Gagal menyimpan perubahan.";
                    setEditingError(msg);
                    return;
                  }

                  setFeed((prev) =>
                    prev.map((p) =>
                      p.id === editingPost.id
                        ? {
                            ...p,
                            title,
                            body,
                            image: imagePath ?? null,
                          }
                        : p,
                    ),
                  );
                  setEditingPost(null);
                } catch {
                  setEditingError("Terjadi kesalahan jaringan saat menyimpan.");
                } finally {
                  setEditingSaving(false);
                }
              }}
            >
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Gambar</label>
                {editingImage ? (
                  <div className="relative aspect-video w-full rounded-md overflow-hidden border border-white/10 bg-black/40">
                    <Image
                      src={editingImage}
                      alt={editingTitle || "Gambar konten"}
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 560px, 100vw"
                      unoptimized
                      onError={() => {}}
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-md border border-white/10 bg-black/40 flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-white/30" />
                  </div>
                )}
                <p className="text-[11px] text-white/50">
                  URL gambar atau upload file. Unggah: maks.{" "}
                  <strong className="text-white/70">
                    {formatImageSizeLabel(MARKETPLACE_IMAGE_MAX_BYTES)}
                  </strong>
                  ; sisi terpanjang max. {MARKETPLACE_IMAGE_MAX_EDGE_PX}px (JPG/PNG/WebP otomatis
                  diperkecil & dikompres agar tidak melebihi kapasitas). GIF tanpa resize, maks. sama.
                  Foto IG: simpan ke perangkat dulu.
                </p>
                <input
                  type="url"
                  value={editingImage}
                  onChange={(e) => {
                    setEditingImage(e.target.value);
                    setUploadImageError(null);
                  }}
                  className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/60"
                  placeholder="Tempel URL (kosongkan untuk tanpa gambar)"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">Atau upload file:</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={uploadImageLoading}
                    className="text-xs text-white/70 file:mr-2 file:rounded file:border-0 file:bg-teal-600 file:px-2 file:py-1 file:text-white file:text-xs"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      setUploadImageError(null);
                      setUploadImageLoading(true);
                      try {
                        const up = await uploadPreparedImage(f, "/api/konten/berita/upload");
                        if (up.ok === false) {
                          setUploadImageError(up.error);
                          return;
                        }
                        setEditingImage(up.url);
                      } catch {
                        setUploadImageError("Gagal mengunggah gambar");
                      } finally {
                        setUploadImageLoading(false);
                      }
                    }}
                  />
                  {uploadImageLoading && (
                    <span className="text-xs text-white/50">Mengunggah…</span>
                  )}
                </div>
                {uploadImageError && (
                  <p className="text-[11px] text-red-300">{uploadImageError}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Judul</label>
                <input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/60"
                  placeholder="Judul konten"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Isi</label>
                <textarea
                  value={editingBody}
                  onChange={(e) => setEditingBody(e.target.value)}
                  className="w-full min-h-[140px] rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/60"
                  placeholder="Isi konten…"
                />
              </div>
              {editingError && (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
                  {editingError}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={editingSaving}
                  onClick={() => !editingSaving && setEditingPost(null)}
                  className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editingSaving || !editingTitle.trim() || !editingBody.trim()}
                  className="rounded-md bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-500 disabled:opacity-50"
                >
                  {editingSaving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Panah scroll ke atas / bawah */}
      <div
        className="fixed bottom-6 right-4 z-50 flex flex-col gap-2 sm:right-6"
        aria-label="Navigasi halaman"
      >
        <button
          type="button"
          onClick={() => scrollDashboardTo(0)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-slate-950/90 text-white/90 shadow-lg backdrop-blur-sm transition-colors hover:border-teal-400/50 hover:bg-teal-950/80 hover:text-teal-200"
          title="Ke atas halaman"
          aria-label="Ke atas halaman"
        >
          <ChevronUp size={22} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => {
            const el = getDashboardScrollEl();
            const max = el
              ? el.scrollHeight - el.clientHeight
              : Math.max(
                  document.documentElement.scrollHeight,
                  document.body.scrollHeight,
                );
            scrollDashboardTo(max);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-slate-950/90 text-white/90 shadow-lg backdrop-blur-sm transition-colors hover:border-teal-400/50 hover:bg-teal-950/80 hover:text-teal-200"
          title="Ke bawah halaman"
          aria-label="Ke bawah halaman"
        >
          <ChevronDown size={22} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
