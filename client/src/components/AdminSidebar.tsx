import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Megaphone,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AdminSidebarProps {
  unreadCount?: number;
  pendingReservationsCount?: number;
}

export default function AdminSidebar({
  unreadCount = 0,
  pendingReservationsCount = 0,
}: AdminSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    {
      label: "Panel Principal",
      icon: LayoutDashboard,
      href: "/admin",
      badge: pendingReservationsCount > 0 ? pendingReservationsCount : undefined,
    },
    {
      label: "Calendario",
      icon: Calendar,
      href: "/calendar",
    },
    {
      label: "Métricas",
      icon: BarChart3,
      href: "/metrics",
    },
    {
      label: "Anuncios",
      icon: Megaphone,
      href: "/anuncios",
    },
    {
      label: "Mis Reservas",
      icon: FileText,
      href: "/mis-reservas",
      userOnly: true,
    },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-white border-r-4 border-[#1a4d3c] h-screen sticky top-0 transition-all duration-300",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo & Toggle */}
        <div className="p-4 border-b-2 border-[#1a4d3c] flex items-center justify-between">
          {!isCollapsed && (
            <Link href="/">
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png"
                alt="Streetview Media"
                className="h-10 cursor-pointer"
              />
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </Button>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1a4d3c] flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || "Usuario"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            // Hide user-only items for admins
            if (item.userOnly && user?.role === "admin") return null;

            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive && "bg-[#1a4d3c] text-white hover:bg-[#0f3a2a]",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {isCollapsed && item.badge && item.badge > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Link href="/">
            <Button
              variant="outline"
              className={cn("w-full justify-start gap-3", isCollapsed && "justify-center px-2")}
            >
              <Home size={20} className="flex-shrink-0" />
              {!isCollapsed && <span>Inicio</span>}
            </Button>
          </Link>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50",
              isCollapsed && "justify-center px-2"
            )}
            onClick={handleLogout}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
