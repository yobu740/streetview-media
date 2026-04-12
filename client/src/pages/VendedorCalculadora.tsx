import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, X, ChevronUp, ChevronDown } from "lucide-react";

type Parada = {
  id: number;
  cobertizoId: string;
  localizacion: string;
  direccion: string;
  orientacion: string;
  tipoFormato: "Fija" | "Digital";
  ruta: string | null;
  activa: number;
  removida: number;
  enConstruccion: number;
};

const ORI_LABEL: Record<string, string> = { I: "Interior", O: "Exterior", P: "Pilón" };
const ORI_STYLE: Record<string, string> = {
  I: "bg-green-50 text-green-700",
  O: "bg-blue-50 text-blue-700",
  P: "bg-slate-100 text-slate-600",
};

const DEFAULT_PRICE = 350;

export default function VendedorCalculadora() {
  const { loading: authLoading, isAuthenticated } = useAuth();

  // Client info
  const [empresa, setEmpresa] = useState("");
  const [contacto, setContacto] = useState("");
  const [email, setEmail] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [oriFilter, setOriFilter] = useState<"" | "I" | "O" | "P">("");
  const [formatoFilter, setFormatoFilter] = useState<"" | "Fija" | "Digital">("");

  // Selection & pricing
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [prices, setPrices] = useState<Record<number, number>>({});

  // Period
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [meses, setMeses] = useState(1);

  const { data: allParadas = [], isLoading } = trpc.paradas.list.useQuery();

  if (authLoading) return null;
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  // Filter paradas
  const paradas = useMemo(() => {
    return (allParadas as Parada[]).filter((p) => {
      if (!p.activa || p.removida || p.enConstruccion) return false;
      if (oriFilter && p.orientacion !== oriFilter) return false;
      if (formatoFilter && p.tipoFormato !== formatoFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.cobertizoId.toLowerCase().includes(q) &&
          !p.localizacion.toLowerCase().includes(q) &&
          !p.direccion.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [allParadas, oriFilter, formatoFilter, search]);

  const selectedParadas = useMemo(
    () => (allParadas as Parada[]).filter((p) => selectedIds.has(p.id)),
    [allParadas, selectedIds]
  );

  function toggleParada(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setPrices((pp) => ({ ...pp, [id]: pp[id] ?? DEFAULT_PRICE }));
      }
      return next;
    });
  }

  function removeParada(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  function setPrice(id: number, val: string) {
    const n = parseFloat(val);
    setPrices((pp) => ({ ...pp, [id]: isNaN(n) ? 0 : n }));
  }

  // Totals
  const subtotalMes = selectedParadas.reduce(
    (sum, p) => sum + (prices[p.id] ?? DEFAULT_PRICE),
    0
  );
  const totalGeneral = subtotalMes * meses;

  const count = selectedIds.size;

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      {/* Page wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/vendedor">
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1a4d3c] transition-colors"
              >
                <ArrowLeft size={14} /> Mi Dashboard
              </button>
            </Link>
            <span className="text-slate-200 text-lg">|</span>
            <span className="text-[15px] font-bold text-slate-900">
              Calculadora de Propuesta
            </span>
            {count > 0 && (
              <span className="text-[11px] font-bold bg-[#1a4d3c]/10 text-[#1a4d3c] px-2.5 py-0.5 rounded-full">
                {count} parada{count !== 1 ? "s" : ""} seleccionada{count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {count > 0 && (
            <Button size="sm" variant="outline" onClick={clearAll} className="text-xs">
              Limpiar selección
            </Button>
          )}
        </div>

        {/* Main layout */}
        <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: "1fr 360px" }}>
          {/* ── Left panel: parada selector ── */}
          <div className="flex flex-col overflow-hidden border-r border-slate-200 bg-white">
            {/* Client info bar */}
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide">
                    Contacto
                  </label>
                  <input
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Nombre del contacto"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
                  />
                </div>
                <div className="flex flex-col gap-1 w-48">
                  <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@cliente.com"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
                  />
                </div>
              </div>
            </div>

            {/* Filters bar */}
            <div className="px-5 py-2.5 border-b border-slate-100 flex gap-2 items-center flex-wrap flex-shrink-0">
              <input
                type="text"
                placeholder="Buscar parada, ruta, dirección..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
              />
              {(["", "I", "O", "P"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setOriFilter(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all whitespace-nowrap ${
                    oriFilter === v
                      ? "border-[#1a4d3c] bg-[#1a4d3c]/8 text-[#1a4d3c]"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {v === "" ? "Todos" : ORI_LABEL[v]}
                </button>
              ))}
              <select
                value={formatoFilter}
                onChange={(e) => setFormatoFilter(e.target.value as "" | "Fija" | "Digital")}
                className="border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white text-slate-500 outline-none"
              >
                <option value="">Formato: Todos</option>
                <option value="Fija">Fija</option>
                <option value="Digital">Digital</option>
              </select>
            </div>

            {/* List header */}
            <div className="px-5 py-1.5 border-b border-slate-100 flex justify-between text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 flex-shrink-0">
              <span>{isLoading ? "Cargando..." : `${paradas.length} paradas`}</span>
              <span>Precio/mes</span>
            </div>

            {/* Paradas list */}
            <div className="flex-1 overflow-y-auto">
              {paradas.map((p) => {
                const sel = selectedIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleParada(p.id)}
                    className={`flex items-center gap-3 px-5 py-2.5 border-b border-slate-50 cursor-pointer transition-colors select-none ${
                      sel ? "bg-[#1a4d3c]/[0.03]" : "hover:bg-slate-50"
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                        sel
                          ? "bg-[#1a4d3c] border-2 border-[#1a4d3c]"
                          : "border-2 border-slate-300 bg-white"
                      }`}
                    >
                      {sel && (
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <polyline
                            points="2,6 5,9 10,3"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10.5px] font-bold text-[#1a4d3c]">
                          #{p.cobertizoId}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">
                        {p.localizacion}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{p.direccion}</p>
                      <div className="flex gap-1 mt-1">
                        <span
                          className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded ${
                            ORI_STYLE[p.orientacion] ?? "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {ORI_LABEL[p.orientacion] ?? p.orientacion}
                        </span>
                        <span
                          className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded ${
                            p.tipoFormato === "Digital"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {p.tipoFormato}
                        </span>
                        {p.ruta && (
                          <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            {p.ruta}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        value={prices[p.id] ?? DEFAULT_PRICE}
                        onChange={(e) => {
                          if (!sel) {
                            setSelectedIds((prev) => new Set([...prev, p.id]));
                          }
                          setPrice(p.id, e.target.value);
                        }}
                        className="w-20 text-right border border-slate-200 rounded-md px-2 py-1 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#1a4d3c]/20 bg-white"
                        min={0}
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">/mes</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right panel: summary ── */}
          <div className="flex flex-col bg-slate-50 overflow-hidden border-l border-slate-200">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-slate-200 bg-white flex-shrink-0">
              <p className="text-[13.5px] font-bold text-slate-900">Resumen de Propuesta</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {count === 0
                  ? "Selecciona paradas en el panel izquierdo"
                  : `${count} parada${count !== 1 ? "s" : ""} · ${meses} mes${meses !== 1 ? "es" : ""}`}
              </p>
            </div>

            {/* Selected items */}
            <div className="flex-1 overflow-y-auto px-3.5 py-2.5">
              {selectedParadas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-slate-400 text-center gap-2">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="opacity-40"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <p className="text-sm">Ninguna parada seleccionada</p>
                </div>
              ) : (
                selectedParadas.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 mb-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          #{p.cobertizoId} · {p.localizacion}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {ORI_LABEL[p.orientacion] ?? p.orientacion} · {p.tipoFormato}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeParada(p.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                        aria-label="Remover"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11.5px] text-slate-500">Precio/mes</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">$</span>
                        <input
                          type="number"
                          value={prices[p.id] ?? DEFAULT_PRICE}
                          onChange={(e) => setPrice(p.id, e.target.value)}
                          className="w-20 text-right border border-slate-200 rounded-md px-2 py-1 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Period selector */}
            <div className="px-4 py-3 border-t border-slate-200 bg-white flex-shrink-0">
              <p className="text-xs font-bold text-slate-800 mb-2">Periodo de Contrato</p>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
                />
                <span className="text-xs text-slate-400">→</span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">Meses</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMeses((m) => Math.max(1, m - 1))}
                    className="w-6 h-6 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-[#1a4d3c] hover:text-[#1a4d3c] transition-colors"
                    aria-label="Menos meses"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <span className="text-sm font-bold text-slate-900 w-5 text-center">
                    {meses}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMeses((m) => Math.min(24, m + 1))}
                    className="w-6 h-6 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-[#1a4d3c] hover:text-[#1a4d3c] transition-colors"
                    aria-label="Más meses"
                  >
                    <ChevronUp size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="px-4 py-3 border-t border-slate-200 bg-white flex-shrink-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-slate-500">
                  {count} parada{count !== 1 ? "s" : ""} × {meses} mes{meses !== 1 ? "es" : ""}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  ${totalGeneral.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500">Subtotal/mes</span>
                <span className="text-sm font-semibold text-slate-800">
                  ${subtotalMes.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                </span>
              </div>
              <hr className="border-slate-100 my-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">TOTAL</span>
                <span className="text-2xl font-extrabold text-[#1a4d3c]">
                  ${totalGeneral.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* Generate buttons */}
            <div className="px-4 pb-4 pt-2 bg-white border-t border-slate-100 flex flex-col gap-2 flex-shrink-0">
              <button
                type="button"
                disabled={count === 0}
                className="w-full py-2.5 rounded-lg bg-[#1a4d3c] text-white text-[13.5px] font-bold transition-all hover:bg-[#0f3a2a] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generar PDF de Propuesta
              </button>
              <button
                type="button"
                disabled={count === 0}
                className="w-full py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[13.5px] font-semibold transition-all hover:border-[#1a4d3c] hover:text-[#1a4d3c] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Convertir a Contrato
              </button>
              {count === 0 && (
                <p className="text-[10.5px] text-slate-400 text-center">
                  Selecciona al menos una parada para continuar
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
