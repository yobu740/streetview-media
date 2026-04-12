import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useMemo } from "react";
import {
  FileText,
  Eye,
  Printer,
  Copy,
  PenLine,
  Upload,
  Edit,
  Trash2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

type ContratoMine = {
  id: number;
  clienteId: number;
  clienteNombre: string | null;
  numeroContrato: string;
  numeroPO: string | null;
  fecha: Date;
  customerId: string | null;
  salesDuration: string | null;
  vendedor: string | null;
  fechaVencimiento: Date | null;
  subtotal: string | null;
  total: string | null;
  numMeses: number | null;
  estado: "Borrador" | "Enviado" | "Firmado" | "Cancelado";
  pdfUrl: string | null;
  firmaUrl: string | null;
  docusealSigningUrl: string | null;
  createdBy: number | null;
  createdAt: Date;
};

const ESTADO_BADGE: Record<string, string> = {
  Firmado: "bg-green-100 text-green-700",
  Enviado: "bg-blue-100 text-blue-700",
  Borrador: "bg-slate-100 text-slate-600",
  Cancelado: "bg-red-100 text-red-600",
};

const FILTROS = ["Todos", "Firmados", "Enviados", "Borradores", "Cancelados"] as const;

export default function VendedorContratos() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [filtro, setFiltro] = useState<string>("Todos");
  const [search, setSearch] = useState("");

  const { data: contratos = [], isLoading } = trpc.contratos.listMine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (authLoading) return null;
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const filtered = useMemo(() => {
    return (contratos as ContratoMine[]).filter((c) => {
      const matchFiltro =
        filtro === "Todos" ||
        (filtro === "Firmados" && c.estado === "Firmado") ||
        (filtro === "Enviados" && c.estado === "Enviado") ||
        (filtro === "Borradores" && c.estado === "Borrador") ||
        (filtro === "Cancelados" && c.estado === "Cancelado");
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.numeroContrato.toLowerCase().includes(q) ||
        (c.clienteNombre ?? "").toLowerCase().includes(q) ||
        (c.customerId ?? "").toLowerCase().includes(q);
      return matchFiltro && matchSearch;
    });
  }, [contratos, filtro, search]);

  // Stats
  const total = (contratos as ContratoMine[]).length;
  const firmados = (contratos as ContratoMine[]).filter((c) => c.estado === "Firmado").length;
  const enviados = (contratos as ContratoMine[]).filter((c) => c.estado === "Enviado").length;
  const borradores = (contratos as ContratoMine[]).filter((c) => c.estado === "Borrador").length;

  const now = Date.now();
  const vencenPronto = (contratos as ContratoMine[]).filter((c) => {
    if (!c.fechaVencimiento) return false;
    const days = Math.ceil((new Date(c.fechaVencimiento).getTime() - now) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 30;
  }).length;

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto bg-slate-50">
        {/* Page header */}
        <div className="bg-white border-b border-slate-200 px-7 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Mis Contratos</h1>
            <p className="text-sm text-slate-500 mt-0.5">Contratos generados por ti</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Contratos" value={total} sub="Año 2026" color="green" />
            <StatCard label="Firmados" value={firmados} sub={`${enviados} enviados`} color="blue" />
            <StatCard label="Borradores" value={borradores} sub="Sin enviar" color="amber" />
            <StatCard label="Vencen este Mes" value={vencenPronto} sub="Oportunidad de renovación" color="purple" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Buscar por cliente o número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1a4d3c]/20 bg-white flex-1 min-w-[200px] max-w-xs"
            />
            {FILTROS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-600 border transition-all ${
                  filtro === f
                    ? "border-[#1a4d3c] bg-[#1a4d3c]/8 text-[#1a4d3c] font-bold"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Contract list */}
          {isLoading ? (
            <p className="text-sm text-slate-400 text-center py-16">Cargando contratos...</p>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <FileText size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No hay contratos que mostrar</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((c) => (
                <ContratoCard key={c.id} contrato={c} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ContratoCard({ contrato: c }: { contrato: ContratoMine }) {
  const numMeses = c.numMeses && c.numMeses > 1 ? c.numMeses : 1;
  const displayTotal = c.total || c.subtotal || "—";
  const isSigned = c.estado === "Firmado";
  const isSent = c.estado === "Enviado";

  // Vencimiento warning
  let vencChip: { label: string; cls: string } | null = null;
  if (c.fechaVencimiento) {
    const days = Math.ceil(
      (new Date(c.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (days > 0 && days <= 30) {
      vencChip = {
        label: `Vence en ${days} días`,
        cls: days <= 7 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700",
      };
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-9 h-9 bg-[#1a4d3c]/10 rounded-lg flex items-center justify-center mt-0.5">
          <FileText size={16} className="text-[#1a4d3c]" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#1a4d3c] text-sm">{c.numeroContrato}</span>
            {c.clienteNombre && (
              <span className="text-xs text-slate-500">{c.clienteNombre}</span>
            )}
            {c.numeroPO && (
              <span className="text-xs text-slate-400">PO: {c.numeroPO}</span>
            )}
            {numMeses > 1 && (
              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                {numMeses} meses
              </span>
            )}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                ESTADO_BADGE[c.estado] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {c.estado}
            </span>
            {vencChip && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${vencChip.cls}`}>
                {vencChip.label}
              </span>
            )}
            {isSigned && c.firmaUrl && (
              <a
                href={c.firmaUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-green-600 underline flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <CheckCircle2 size={10} /> Firmado
              </a>
            )}
            {isSent && c.docusealSigningUrl && (
              <a
                href={c.docusealSigningUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 underline flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={10} /> Ver firma
              </a>
            )}
          </div>

          {/* Meta row */}
          <div className="text-xs text-slate-500 mt-0.5 flex gap-3 flex-wrap">
            <span>{new Date(c.fecha).toLocaleDateString("es-PR")}</span>
            {c.salesDuration && <span>{c.salesDuration}</span>}
            <span className="font-semibold text-[#1a4d3c]">{displayTotal}</span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-1 mt-2">
            {c.pdfUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => window.open(c.pdfUrl!, "_blank")}
              >
                <Eye size={12} className="mr-1" /> Ver
              </Button>
            )}
            {c.pdfUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => window.open(c.pdfUrl!, "_blank")}
              >
                <Printer size={12} className="mr-1" /> PDF
              </Button>
            )}
            {!isSigned && (
              <Button
                size="sm"
                variant="ghost"
                className={`h-7 px-2 text-xs ${
                  isSent ? "text-blue-600 hover:text-blue-700" : "text-[#1a4d3c]"
                }`}
                disabled
                title="Acción disponible en área de administración"
              >
                <PenLine size={12} className="mr-1" />
                {isSent ? "Reenviar para Firma" : "Enviar para Firma"}
              </Button>
            )}
            {(isSent || isSigned) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700"
                disabled
                title="Acción disponible en área de administración"
              >
                <Upload size={12} className="mr-1" /> PDF Firmado
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled>
              <Copy size={12} className="mr-1" /> Duplicar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled title="Editar">
              <Edit size={12} />
            </Button>
          </div>
        </div>
      </div>
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
    amber: "border-l-amber-500",
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
