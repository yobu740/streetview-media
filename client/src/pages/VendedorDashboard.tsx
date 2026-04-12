import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import { Link } from "wouter";
import {
  UserPlus,
  DollarSign,
  Calendar,
  Map,
  Pencil,
} from "lucide-react";

export default function VendedorDashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaInput, setMetaInput] = useState("18000");

  const { data: myFollowUps = [], isLoading } = trpc.seguimientos.myFollowUps.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: pending = [] } = trpc.seguimientos.pending.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (authLoading) return null;
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const activeFollowUps = myFollowUps.filter((s: any) => s.estado !== "Archivado").length;
  const urgentToday = pending.filter((p: any) => {
    const venc = p.fechaVencimiento
      ? new Date(p.fechaVencimiento).toISOString().split("T")[0]
      : "";
    return venc === todayStr;
  }).length;

  const dayName = today.toLocaleDateString("es-PR", { weekday: "long" });
  const dateStr = today.toLocaleDateString("es-PR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const metaNum = parseInt(metaInput) || 0;

  function urgencyDot(s: any) {
    if (!s.fechaVencimiento) return "bg-blue-400";
    const days = Math.ceil(
      (new Date(s.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 0) return "bg-red-500";
    if (days <= 3) return "bg-amber-400";
    return "bg-blue-400";
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto bg-slate-50">
        {/* Page header */}
        <div className="bg-white border-b border-slate-200 px-7 py-5">
          <h1 className="text-xl font-bold text-slate-900">
            Buenos días, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 capitalize">
            {dayName}, {dateStr} · Tienes {pending.length} seguimientos pendientes
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Seguimientos Activos"
              value={activeFollowUps}
              sub="Total asignados"
              color="green"
            />
            <StatCard
              label="Pendientes Hoy"
              value={pending.length}
              sub={`${urgentToday} urgentes`}
              color="red"
            />
            <StatCard
              label="Contratos este Mes"
              value="—"
              sub="Ver en Mis Contratos"
              color="blue"
            />
            <StatCard
              label="Tasa de Conversión"
              value="—"
              sub="Próximamente"
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: seguimientos + quick actions */}
            <div className="lg:col-span-2 space-y-4">
              {/* Mis Seguimientos */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Mis Seguimientos</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {myFollowUps.length} activos
                    </p>
                  </div>
                  <Link href="/seguimientos">
                    <Button size="sm" variant="ghost" className="text-xs text-[#1a4d3c]">
                      Ver todos
                    </Button>
                  </Link>
                </div>
                <div className="divide-y divide-slate-50">
                  {isLoading ? (
                    <p className="text-sm text-slate-400 px-5 py-8 text-center">Cargando...</p>
                  ) : myFollowUps.length === 0 ? (
                    <p className="text-sm text-slate-400 px-5 py-8 text-center">
                      No tienes seguimientos asignados
                    </p>
                  ) : (
                    (myFollowUps as any[]).slice(0, 6).map((s) => (
                      <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${urgencyDot(s)}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {s.cliente}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{s.producto}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                              {s.estado}
                            </span>
                            {s.fechaVencimiento && (
                              <span className="text-[10px] text-slate-400">
                                {new Date(s.fechaVencimiento).toLocaleDateString("es-PR")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href="/seguimientos">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs flex-shrink-0"
                          >
                            Registrar
                          </Button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">Acciones Rápidas</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4">
                  <Link href="/seguimientos">
                    <QuickAction
                      icon={<UserPlus size={18} />}
                      label="Nuevo Seguimiento"
                      desc="Agregar cliente al pipeline"
                      color="green"
                    />
                  </Link>
                  <Link href="/vendedor/calculadora">
                    <QuickAction
                      icon={<DollarSign size={18} />}
                      label="Calcular Propuesta"
                      desc="Seleccionar paradas y cotizar"
                      color="orange"
                    />
                  </Link>
                  <Link href="/calendar">
                    <QuickAction
                      icon={<Calendar size={18} />}
                      label="Ver Calendario"
                      desc="Mis eventos del mes"
                      color="blue"
                    />
                  </Link>
                  <Link href="/admin">
                    <QuickAction
                      icon={<Map size={18} />}
                      label="Paradas Libres"
                      desc="Ver disponibilidad en mapa"
                      color="purple"
                    />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: meta mensual */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Meta Mensual</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {today.toLocaleDateString("es-PR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingMeta(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 hover:bg-slate-100 transition-colors"
                  >
                    <Pencil size={11} /> Editar meta
                  </button>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">Revenue acumulado</span>
                    <span className="text-sm font-bold text-[#1a4d3c]">
                      $0 / ${metaNum.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1a4d3c] to-[#ff6b35]"
                      style={{ width: "0%" }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>$0</span>
                    <span className="font-semibold text-slate-600">0% completado</span>
                    <span>${metaNum.toLocaleString()}</span>
                  </div>
                </div>
                {editingMeta && (
                  <div className="px-5 pb-4 flex gap-2">
                    <input
                      type="number"
                      value={metaInput}
                      onChange={(e) => setMetaInput(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#1a4d3c]/30"
                      placeholder="Ej. 18000"
                    />
                    <Button
                      size="sm"
                      className="bg-[#1a4d3c] text-white hover:bg-[#0f3a2a]"
                      onClick={() => setEditingMeta(false)}
                    >
                      Guardar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: any;
  sub: string;
  color: string;
}) {
  const borderMap: Record<string, string> = {
    green: "border-l-[#1a4d3c]",
    blue: "border-l-blue-500",
    red: "border-l-red-500",
    purple: "border-l-purple-500",
  };
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 border-l-4 ${
        borderMap[color] ?? "border-l-slate-400"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
        {label}
      </p>
      <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>
      <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  desc,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    green: "bg-[#1a4d3c]/10 text-[#1a4d3c]",
    orange: "bg-orange-100 text-orange-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 cursor-pointer transition-all">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          colorMap[color] ?? "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 leading-none">{label}</p>
        <p className="text-[11px] text-slate-400 mt-1">{desc}</p>
      </div>
    </div>
  );
}
