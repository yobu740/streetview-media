import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { X, ChevronUp, ChevronDown, FileText, Loader2, Search, UserCheck, Menu, UserPlus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
  tags: string | null;
};

const ORI_LABEL: Record<string, string> = { I: "Interior", O: "Exterior", P: "Pilón" };
const ORI_STYLE: Record<string, string> = {
  I: "bg-green-50 text-green-700",
  O: "bg-blue-50 text-blue-700",
  P: "bg-slate-100 text-slate-600",
};

const STRATEGIC_TAGS = [
  "Hospitales",
  "Residenciales",
  "Complejo Turístico",
  "Supermercados",
  "Universidades",
  "Bancos y Cooperativas",
  "Farmacias",
  "Centros Comerciales y Retail",
  "Edificios Gubernamentales",
  "Entretenimiento y Parques",
  "Cadenas de Comida Rápida",
  "Restaurantes y Cafés",
  "Gasolineras",
];

const DEFAULT_PRICE = 350;

export default function VendedorCalculadora() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Mobile panel state
  const [showSummary, setShowSummary] = useState(false);

  // Client selector state
  const [clienteSearch, setClienteSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<{
    id: number;
    nombre: string;
    contactoPrincipal: string | null;
    email: string | null;
  } | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  // Derived fields for PDF generation
  const empresa = selectedCliente?.nombre ?? clienteSearch;
  const contacto = selectedCliente?.contactoPrincipal ?? "";
  const email = selectedCliente?.email ?? "";

  const { data: clientesData = [] } = trpc.clientes.listForSelect.useQuery();

  const filteredClientes = useMemo(() => {
    if (!clienteSearch.trim()) return clientesData.slice(0, 8);
    const q = clienteSearch.toLowerCase();
    return clientesData
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          (c.contactoPrincipal ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [clientesData, clienteSearch]);

  // Close combo on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filters
  const [search, setSearch] = useState("");
  const [oriFilter, setOriFilter] = useState<"" | "I" | "O" | "P">("");
  const [formatoFilter, setFormatoFilter] = useState<"" | "Fija" | "Digital">("");
  const [tagFilter, setTagFilter] = useState<string>("");

  // Selection & pricing
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [prices, setPrices] = useState<Record<number, number>>({});

  // Period
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [meses, setMeses] = useState(1);

  // Discount
  const [descuento, setDescuento] = useState(0);

  const generatePdfMutation = trpc.cotizaciones.generatePdf.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success(`Cotización ${data.cotizacionNumber} generada exitosamente.`);
    },
    onError: (err) => {
      toast.error(`Error al generar PDF: ${err.message}`);
    },
  });

  // Quick-create client modal state
  const [showCreateCliente, setShowCreateCliente] = useState(false);
  const [newClienteNombre, setNewClienteNombre] = useState("");
  const [newClienteContacto, setNewClienteContacto] = useState("");
  const [newClienteEmail, setNewClienteEmail] = useState("");
  const [newClienteTelefono, setNewClienteTelefono] = useState("");

  const utils = trpc.useUtils();
  const vendedorCreateClienteMutation = trpc.clientes.vendedorCreate.useMutation({
    onSuccess: (data) => {
      setSelectedCliente({ id: data.id, nombre: data.nombre, contactoPrincipal: data.contactoPrincipal, email: data.email });
      setClienteSearch("");
      setShowCreateCliente(false);
      setNewClienteNombre("");
      setNewClienteContacto("");
      setNewClienteEmail("");
      setNewClienteTelefono("");
      utils.clientes.listForSelect.invalidate();
      toast.success(`Cliente "${data.nombre}" creado y seleccionado.`);
    },
    onError: (err) => {
      toast.error(`Error al crear cliente: ${err.message}`);
    },
  });

  const vendedorCreateMutation = trpc.contratos.vendedorCreate.useMutation({
    onSuccess: (data) => {
      toast.success("Contrato creado como Borrador. Redirigiendo...");
      navigate("/vendedor/contratos");
    },
    onError: (err) => {
      toast.error(`Error al crear contrato: ${err.message}`);
    },
  });

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
      if (tagFilter) {
        if (!p.tags) return false;
        try {
          const paradaTags: string[] = JSON.parse(p.tags);
          if (!paradaTags.includes(tagFilter)) return false;
        } catch {
          return false;
        }
      }
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
  }, [allParadas, oriFilter, formatoFilter, tagFilter, search]);

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
  const subtotalTotal = subtotalMes * meses;
  const totalGeneral = Math.max(0, subtotalTotal - descuento);

  const count = selectedIds.size;

  function handleConvertirAContrato() {
    if (count === 0) return;
    // Generate contract number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const rand = Math.floor(Math.random() * 9000) + 1000;
    const numeroContrato = `SV-${year}${month}-${rand}`;

    const items = selectedParadas.map((p) => ({
      cantidad: 1,
      concepto: `Parada #${p.cobertizoId} - ${p.localizacion} (${ORI_LABEL[p.orientacion] ?? p.orientacion}, ${p.tipoFormato})`,
      precioPorUnidad: String(prices[p.id] ?? DEFAULT_PRICE),
      total: String((prices[p.id] ?? DEFAULT_PRICE) * meses),
      isProduccion: 0,
    }));

    vendedorCreateMutation.mutate({
      clienteId: selectedCliente?.id ?? null,
      clienteNombre: empresa || undefined,
      numeroContrato,
      fecha: new Date(),
      fechaVencimiento: fechaFin ? new Date(fechaFin) : null,
      subtotal: String(subtotalTotal),
      total: String(totalGeneral),
      numMeses: meses,
      notas: `Propuesta generada desde Calculadora. Cliente: ${empresa}. Período: ${fechaInicio || "—"} → ${fechaFin || "—"}.`,
      items,
    });
  }

  // Summary panel (shared between desktop right panel and mobile drawer)
  const SummaryPanel = () => (
    <div className="flex flex-col bg-slate-50 h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 bg-white flex-shrink-0 flex items-center justify-between">
        <div>
          <p className="text-[13.5px] font-bold text-slate-900">Resumen de Propuesta</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {count === 0
              ? "Selecciona paradas en el panel izquierdo"
              : `${count} parada${count !== 1 ? "s" : ""} · ${meses} mes${meses !== 1 ? "es" : ""}`}
          </p>
        </div>
        {/* Close button for mobile */}
        <button
          type="button"
          onClick={() => setShowSummary(false)}
          className="lg:hidden text-slate-400 hover:text-slate-600"
          aria-label="Cerrar resumen"
        >
          <X size={18} />
        </button>
      </div>

      {/* Selected items */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2.5">
        {selectedParadas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 text-slate-400 text-center gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <p className="text-sm">Ninguna parada seleccionada</p>
          </div>
        ) : (
          selectedParadas.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 mb-2">
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
            <span className="text-sm font-bold text-slate-900 w-5 text-center">{meses}</span>
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
            ${subtotalTotal.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-500">Subtotal/mes</span>
          <span className="text-sm font-semibold text-slate-800">
            ${subtotalMes.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </span>
        </div>
        <hr className="border-slate-100 my-2" />
        <div className="flex items-center justify-between mt-2 mb-1">
          <span className="text-xs text-slate-500">Descuento ($)</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400">$</span>
            <input
              type="number"
              value={descuento === 0 ? "" : descuento}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setDescuento(isNaN(v) ? 0 : Math.max(0, v));
              }}
              placeholder="0"
              className="w-24 text-right border border-slate-200 rounded-md px-2 py-1 text-sm font-bold text-[#ff6b35] outline-none focus:ring-2 focus:ring-[#ff6b35]/20"
              min={0}
            />
          </div>
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
        {/* Client required warning */}
        {count > 0 && !selectedCliente && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 leading-snug">
              Selecciona un cliente para generar el PDF o convertir a contrato.
              {clienteSearch.trim() && (
                <button
                  type="button"
                  onClick={() => { setNewClienteNombre(clienteSearch); setShowCreateCliente(true); }}
                  className="ml-1 underline font-semibold"
                >
                  Crear &ldquo;{clienteSearch}&rdquo;
                </button>
              )}
            </p>
          </div>
        )}
        <button
          type="button"
          disabled={count === 0 || !selectedCliente || generatePdfMutation.isPending}
          onClick={() => {
            if (!selectedCliente) { toast.error("Selecciona un cliente antes de generar el PDF."); return; }
            generatePdfMutation.mutate({
              empresa,
              contacto,
              email,
              fechaInicio,
              fechaFin,
              meses,
              descuento,
              paradas: selectedParadas.map((p) => ({
                cobertizoId: p.cobertizoId,
                localizacion: p.localizacion,
                direccion: p.direccion,
                orientacion: p.orientacion,
                tipoFormato: p.tipoFormato,
                ruta: p.ruta ?? null,
                precioMes: prices[p.id] ?? DEFAULT_PRICE,
              })),
            });
          }}
          className="w-full py-2.5 rounded-lg bg-[#1a4d3c] text-white text-[13.5px] font-bold transition-all hover:bg-[#0f3a2a] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {generatePdfMutation.isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Generando PDF...</>
          ) : (
            <><FileText size={14} /> Generar PDF de Propuesta</>
          )}
        </button>
        <button
          type="button"
          disabled={count === 0 || !selectedCliente || vendedorCreateMutation.isPending}
          onClick={handleConvertirAContrato}
          className="w-full py-2.5 rounded-lg bg-white border border-[#1a4d3c] text-[#1a4d3c] text-[13.5px] font-semibold transition-all hover:bg-[#1a4d3c]/5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {vendedorCreateMutation.isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Creando contrato...</>
          ) : (
            "Convertir a Contrato"
          )}
        </button>
        {count === 0 && (
          <p className="text-[10.5px] text-slate-400 text-center">
            Selecciona al menos una parada para continuar
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      {/* Page wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-4 lg:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[15px] font-bold text-slate-900 truncate">
              Calculadora de Propuesta
            </span>
            {count > 0 && (
              <span className="hidden sm:inline text-[11px] font-bold bg-[#1a4d3c]/10 text-[#1a4d3c] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                {count} parada{count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {count > 0 && (
              <Button size="sm" variant="outline" onClick={clearAll} className="text-xs hidden sm:flex">
                Limpiar selección
              </Button>
            )}
            {/* Mobile: toggle summary panel */}
            <button
              type="button"
              onClick={() => setShowSummary(!showSummary)}
              className="lg:hidden flex items-center gap-1.5 text-sm font-semibold text-[#1a4d3c] bg-[#1a4d3c]/10 px-3 py-1.5 rounded-lg"
            >
              <Menu size={14} />
              Resumen {count > 0 && <span className="bg-[#1a4d3c] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>}
            </button>
          </div>
        </div>

        {/* Main layout — desktop: side by side; mobile: stacked with drawer */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* ── Left panel: parada selector ── */}
          <div className={`flex flex-col overflow-hidden border-r border-slate-200 bg-white transition-all ${showSummary ? "hidden" : "flex-1"} lg:flex lg:flex-1`}>
            {/* Client selector bar */}
            <div className="px-4 lg:px-5 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                {/* Client combobox */}
                <div className="flex flex-col gap-1 w-full sm:flex-1" ref={comboRef}>
                  <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide">
                    Cliente
                  </label>
                  <div className="relative">
                    {selectedCliente ? (
                      <div className="flex items-center gap-2 border border-[#1a4d3c] rounded-lg px-3 py-1.5 bg-[#1a4d3c]/5">
                        <UserCheck size={14} className="text-[#1a4d3c] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{selectedCliente.nombre}</p>
                          {selectedCliente.contactoPrincipal && (
                            <p className="text-[11px] text-slate-500 truncate">{selectedCliente.contactoPrincipal}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedCliente(null); setClienteSearch(""); }}
                          className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                          aria-label="Cambiar cliente"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={clienteSearch}
                          onChange={(e) => { setClienteSearch(e.target.value); setComboOpen(true); }}
                          onFocus={() => setComboOpen(true)}
                          placeholder="Buscar cliente registrado..."
                          className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
                        />
                        {comboOpen && filteredClientes.length > 0 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                            {filteredClientes.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setSelectedCliente(c);
                                  setClienteSearch("");
                                  setComboOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-[#1a4d3c]/5 transition-colors border-b border-slate-50 last:border-0"
                              >
                                <p className="text-sm font-semibold text-slate-800">{c.nombre}</p>
                                {(c.contactoPrincipal || c.email) && (
                                  <p className="text-[11px] text-slate-400 truncate">
                                    {[c.contactoPrincipal, c.email].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                        {comboOpen && clienteSearch.trim() && filteredClientes.length === 0 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-3">
                            <p className="text-xs text-slate-500 mb-2">No se encontró &ldquo;{clienteSearch}&rdquo; en el sistema.</p>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setNewClienteNombre(clienteSearch);
                                setShowCreateCliente(true);
                                setComboOpen(false);
                              }}
                              className="flex items-center gap-1.5 text-xs font-semibold text-[#1a4d3c] hover:text-[#0f3a2a] transition-colors"
                            >
                              <UserPlus size={13} />
                              Crear cliente &ldquo;{clienteSearch}&rdquo;
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Read-only contact + email when client is selected */}
                {selectedCliente && (
                  <div className="hidden sm:flex gap-3 flex-1">
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide">Contacto</label>
                      <div className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 bg-white truncate">
                        {selectedCliente.contactoPrincipal || <span className="text-slate-300">—</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 w-48">
                      <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide">Email</label>
                      <div className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 bg-white truncate">
                        {selectedCliente.email || <span className="text-slate-300">—</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filters bar */}
            <div className="px-4 lg:px-5 py-2.5 border-b border-slate-100 flex flex-wrap gap-2 items-center flex-shrink-0">
              <input
                type="text"
                placeholder="Buscar parada, ruta, dirección..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[150px] border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
              />
              {/* Orientation filter — hide Pilón, only Interior/Exterior */}
              {(["", "I", "O"] as const).map((v) => (
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
              {/* Strategic point dropdown */}
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white text-slate-600 outline-none max-w-[180px]"
              >
                <option value="">Punto Estratégico: Todos</option>
                {STRATEGIC_TAGS.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              {/* Formato filter */}
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
            <div className="px-4 lg:px-5 py-1.5 border-b border-slate-100 flex justify-between text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 flex-shrink-0">
              <span>{isLoading ? "Cargando..." : `${paradas.length} paradas`}</span>
              <span>Precio/mes</span>
            </div>

            {/* Paradas list */}
            <div className="flex-1 overflow-y-auto">
              {paradas.map((p) => {
                const sel = selectedIds.has(p.id);
                // Parse tags for display
                let paradaTags: string[] = [];
                try { if (p.tags) paradaTags = JSON.parse(p.tags); } catch {}

                return (
                  <div
                    key={p.id}
                    onClick={() => toggleParada(p.id)}
                    className={`flex items-center gap-3 px-4 lg:px-5 py-2.5 border-b border-slate-50 cursor-pointer transition-colors select-none ${
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
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                          <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded ${ORI_STYLE[p.orientacion] ?? "bg-slate-100 text-slate-500"}`}>
                          {ORI_LABEL[p.orientacion] ?? p.orientacion}
                        </span>
                        <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded ${p.tipoFormato === "Digital" ? "bg-purple-50 text-purple-700" : "bg-amber-50 text-amber-700"}`}>
                          {p.tipoFormato}
                        </span>
                        {p.ruta && (
                          <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            {p.ruta}
                          </span>
                        )}
                        {paradaTags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700">
                            {tag}
                          </span>
                        ))}
                        {paradaTags.length > 2 && (
                          <span className="text-[9.5px] text-slate-400">+{paradaTags.length - 2}</span>
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

          {/* ── Right panel: summary (desktop always visible, mobile as overlay) ── */}
          {/* Desktop */}
          <div className="hidden lg:flex lg:flex-col lg:w-[360px] border-l border-slate-200 overflow-hidden">
            <SummaryPanel />
          </div>

          {/* Mobile overlay */}
          {showSummary && (
            <div className="lg:hidden absolute inset-0 z-30 flex flex-col bg-white">
              <SummaryPanel />
            </div>
          )}
        </div>
      </div>

      {/* Quick-create client modal */}
      {showCreateCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus size={16} className="text-[#1a4d3c]" />
                Crear nuevo cliente
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateCliente(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div>
                <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Nombre / Empresa *</label>
                <input
                  type="text"
                  value={newClienteNombre}
                  onChange={(e) => setNewClienteNombre(e.target.value)}
                  placeholder="Ej: Acme Corp"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Contacto principal</label>
                <input
                  type="text"
                  value={newClienteContacto}
                  onChange={(e) => setNewClienteContacto(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Email</label>
                  <input
                    type="email"
                    value={newClienteEmail}
                    onChange={(e) => setNewClienteEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={newClienteTelefono}
                    onChange={(e) => setNewClienteTelefono(e.target.value)}
                    placeholder="787-000-0000"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1a4d3c]/20"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCreateCliente(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!newClienteNombre.trim() || vendedorCreateClienteMutation.isPending}
                onClick={() => {
                  if (!newClienteNombre.trim()) return;
                  vendedorCreateClienteMutation.mutate({
                    nombre: newClienteNombre.trim(),
                    contactoPrincipal: newClienteContacto.trim() || undefined,
                    email: newClienteEmail.trim() || undefined,
                    telefono: newClienteTelefono.trim() || undefined,
                  });
                }}
                className="px-4 py-2 text-sm font-semibold bg-[#1a4d3c] text-white rounded-lg hover:bg-[#0f3a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {vendedorCreateClienteMutation.isPending ? (
                  <><Loader2 size={13} className="animate-spin" /> Creando...</>
                ) : (
                  <><UserPlus size={13} /> Crear y seleccionar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>  {/* end root div */}
    </>
  );
}
