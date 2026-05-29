"use client";
/**
 * components/admin/LogoutButton.tsx
 * Botón que cierra la sesión del panel de administración.
 */

export default function LogoutButton() {
  async function handleLogout() {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } finally {
      window.location.replace("/admin/login");
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-green-200 ring-1 ring-white/20 hover:bg-white/10 hover:text-white transition active:scale-95"
      title="Cerrar sesión"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L8.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zM13 9a1 1 0 100 2h4a1 1 0 100-2h-4z" clipRule="evenodd" />
      </svg>
      Salir
    </button>
  );
}
