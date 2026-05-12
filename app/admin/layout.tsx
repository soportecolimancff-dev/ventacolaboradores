/**
 * app/admin/layout.tsx
 */
import { type ReactNode } from "react";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import LogoutButton from "@/components/admin/LogoutButton";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* ── Sidebar desktop ─────────────────────────────── */}
      <aside className="hidden w-64 flex-shrink-0 flex-col md:flex"
        style={{ background: "linear-gradient(175deg, #14532d 0%, #166534 60%, #15803d 100%)" }}>

        {/* Logo */}
        <div className="px-5 py-6">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl shadow-inner ring-1 ring-white/20 transition group-hover:bg-white/25">
              🍊
            </div>
            <div>
              <p className="text-base font-extrabold text-white leading-tight">Coliman</p>
              <p className="text-xs text-green-300 leading-tight">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Separador */}
        <div className="mx-4 h-px bg-white/10" />

        {/* Nav */}
        <nav className="flex-1 p-4">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-green-400/70">
            Navegacion
          </p>
          <AdminNav />
        </nav>

        {/* Footer */}
        <div className="mx-4 h-px bg-white/10" />
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime-400" />
          </span>
          <span className="text-xs text-green-400">v1.0 · Fruta Coliman</span>
          <div className="ml-auto">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ── Area principal ──────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Header movil */}
        <header className="flex items-center gap-3 px-4 py-3 text-white md:hidden"
          style={{ background: "linear-gradient(90deg, #14532d, #166534)" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-lg ring-1 ring-white/20">
            🍊
          </div>
          <p className="font-bold tracking-tight">Coliman Admin</p>
          <div className="ml-auto flex items-center gap-2">
            <LogoutButton />
            <AdminNav mobile />
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
