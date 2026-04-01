import { Bell, Menu, X } from "lucide-react";
import { Link } from "wouter";
import { useMobileNav } from "@/contexts/MobileNavContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function DashboardHeader() {
  const { isMobileOpen, setIsMobileOpen } = useMobileNav();
  const { user, isAuthenticated } = useAuth();
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  return (
    <header className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-50 h-14 flex items-center justify-between px-4 print:hidden">
      <button
        type="button"
        aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
      >
        {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <Link href="/">
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png"
          alt="Streetview Media"
          className="h-7 cursor-pointer"
        />
      </Link>

      <div className="w-9 flex justify-end">
        {isAuthenticated && (
          <Link href="/notificaciones">
            <button
              type="button"
              className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ff6b35] rounded-full" />
              )}
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}
