"use client";
/**
 * components/admin/AdminNav.tsx
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin",          label: "Dashboard", emoji: "📊" },
  { href: "/admin/pedidos",  label: "Pedidos",   emoji: "📦" },
  { href: "/admin/catalogo", label: "Catalogo",  emoji: "🍎" },
  { href: "/admin/limites",  label: "Limites",   emoji: "⚙️" },
];

function isActive(href: string, pathname: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export default function AdminNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <div className="flex gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition ${
              isActive(item.href, pathname)
                ? "bg-white text-green-900 shadow"
                : "text-green-200 hover:bg-white/15 hover:text-white"
            }`}
          >
            {item.emoji}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {NAV.map((item) => {
        const active = isActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
              active
                ? "bg-white text-green-900 shadow-md"
                : "text-green-200 hover:bg-white/15 hover:text-white"
            }`}
          >
            <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-base transition-all ${
              active
                ? "bg-green-100 shadow-sm"
                : "bg-white/10 group-hover:bg-white/20"
            }`}>
              {item.emoji}
            </span>
            <span className="flex-1">{item.label}</span>
            {active && (
              <span className="h-2 w-2 rounded-full bg-green-500" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
