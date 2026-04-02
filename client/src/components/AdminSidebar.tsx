import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMobileNav } from "@/contexts/MobileNavContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  FileText,
  Receipt,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Printer,
  X,
  Menu,
  Wrench,
  UserCheck,
  Bell,
  Package,
  ChevronDown,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface AdminSidebarProps {
  unreadCount?: number;
  pendingReservationsCount?: number;
  onExportExcel?: () => void;
  onPrintReport?: () => void;
}

// Custom billboard icon matching the Anuncios SVG asset
const BillboardIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Billboard frame outer */}
    <rect x="1" y="1" width="22" height="17" rx="0.5" stroke="currentColor" strokeWidth="2" fill="none" />
    {/* Billboard frame inner (display area) */}
    <rect x="3.5" y="3.5" width="17" height="12" rx="0" fill="none" stroke="currentColor" strokeWidth="1.5" />
    {/* Post/stem */}
    <rect x="10.5" y="18" width="3" height="3.5" fill="currentColor" />
    {/* Base */}
    <rect x="7" y="21.5" width="10" height="1.5" rx="0.5" fill="currentColor" />
  </svg>
);

const navGroups = [
  {
    label: "General",
    items: [
      { label: "Panel Principal", icon: LayoutDashboard, href: "/admin",    badgeKey: "pending" },
      { label: "Calendario",      icon: Calendar,        href: "/calendar"  },
      { label: "Métricas",        icon: BarChart3,        href: "/metrics"   },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { label: "Anuncios",       icon: BillboardIcon, href: "/anuncios"    },
      { label: "Mantenimiento",  icon: Wrench,     href: "/mantenimiento" },
      { label: "Instalación",    icon: Package,    href: "/instalacion",  adminOnly: true },
      { label: "Seguimientos",   icon: UserCheck,  href: "/seguimientos" },
    ],
  },
  {
    label: "Clientes",
    items: [
      { label: "Clientes",    icon: Building2, href: "/clientes",   adminOnly: true },
      { label: "Facturación", icon: Receipt,   href: "/facturacion", adminOnly: true },
      { label: "Mis Reservas",icon: FileText,  href: "/mis-reservas", userOnly: true },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Notificaciones", icon: Bell, href: "/notificaciones", badgeKey: "pending" },
    ],
  },
];

export default function AdminSidebar({
  pendingReservationsCount = 0,
  onExportExcel,
  onPrintReport,
}: AdminSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isMobileOpen, setIsMobileOpen } = useMobileNav();

  const { data: recentActivities = [] } = trpc.activity.recent.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });

  const getBadge = (badgeKey?: string) =>
    badgeKey === "pending" && pendingReservationsCount > 0
      ? pendingReservationsCount
      : undefined;

  const SidebarInner = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full bg-white">

      {/* Brand header */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-slate-100",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663148968393/NB4DzLv3DwSWij5HcQ7rQi/SV-logo-ico_9d765421.png" alt="Streetview Media" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
            <div className="leading-none">
              <p className="text-[13px] font-bold text-slate-900 tracking-tight leading-none">Streetview</p>
              <p className="text-[10px] font-medium text-[#1a4d3c] uppercase tracking-[0.08em] mt-[3px]">Media</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663148968393/NB4DzLv3DwSWij5HcQ7rQi/SV-logo-ico_9d765421.png" alt="Streetview Media" className="w-8 h-8 rounded-full object-cover" />
        )}

        {/* Collapse / close button */}
        {onClose ? (
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={14} />
          </button>
        ) : (
          <button
            type="button"
            aria-label={isCollapsed ? "Expandir" : "Colapsar"}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => {
          const visible = group.items.filter((item) => {
            if ((item as any).userOnly  && user?.role === "admin") return false;
            if ((item as any).adminOnly && user?.role !== "admin") return false;
            return true;
          });
          if (visible.length === 0) return null;

          return (
            <div key={group.label}>
              {!isCollapsed && (
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const Icon  = item.icon;
                  const active = location === item.href;
                  const badge  = getBadge((item as any).badgeKey);

                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        type="button"
                        onClick={onClose}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                          active
                            ? "bg-[#1a4d3c]/10 text-[#1a4d3c]"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                          isCollapsed && "justify-center px-2"
                        )}
                      >
                        <Icon
                          size={16}
                          className={cn(
                            "flex-shrink-0",
                            active ? "text-[#1a4d3c]" : "text-slate-400"
                          )}
                        />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            {badge && badge > 0 && (
                              <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-[#1a4d3c]/15 text-[#1a4d3c] rounded-full">
                                {badge > 99 ? "99+" : badge}
                              </span>
                            )}
                          </>
                        )}
                        {isCollapsed && badge && badge > 0 && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#1a4d3c] rounded-full" />
                        )}
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Admin tools */}
        {user?.role === "admin" && !isCollapsed && (
          <div>
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Herramientas
            </p>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={onExportExcel}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-150"
              >
                <FileSpreadsheet size={16} className="text-slate-400 flex-shrink-0" />
                <span className="flex-1 text-left">Exportar Excel</span>
              </button>
              <button
                type="button"
                onClick={onPrintReport}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-150"
              >
                <Printer size={16} className="text-slate-400 flex-shrink-0" />
                <span className="flex-1 text-left">Imprimir Reporte</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Recent activity */}
      {!isCollapsed && recentActivities.length > 0 && (
        <div className="px-3 pt-3 pb-2 border-t border-slate-100">
          <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Actividad Reciente
          </p>
          <div className="space-y-1">
            {recentActivities.slice(0, 3).map((activity) => (
              <div key={activity.id} className="px-2.5 py-2 rounded-lg bg-slate-50 text-xs">
                <p className="font-medium text-slate-700 truncate">{activity.action}</p>
                <p className="text-slate-400 mt-0.5">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: es })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User footer */}
      <div className="px-3 py-3 border-t border-slate-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left",
                isCollapsed && "justify-center"
              )}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1a4d3c] to-[#0d2e24] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate leading-none">
                      {user?.name || user?.email}
                    </p>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">
                      {user?.role || "Usuario"}
                    </p>
                  </div>
                  <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52 mb-1">
            <div className="px-2 py-2 border-b border-slate-100 mb-1">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name || user?.email}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
            </div>
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-white border-r border-slate-200 h-screen sticky top-0 transition-all duration-200 shadow-sm",
        isCollapsed ? "w-[60px]" : "w-[220px]"
      )}>
        <SidebarInner />
      </aside>

      {/* Mobile drawer — triggered from DashboardHeader */}
      <div className="lg:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
        <aside className={cn(
          "fixed top-0 left-0 h-full w-[220px] bg-white border-r border-slate-200 z-50 shadow-xl transform transition-transform duration-200",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <SidebarInner onClose={() => setIsMobileOpen(false)} />
        </aside>
      </div>
    </>
  );
}
