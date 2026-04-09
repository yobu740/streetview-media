import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { formatDateDisplay } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Check, Calendar, Search, Download, Trash2, FileDown, PlusCircle, CreditCard, Banknote, X, Mail, RefreshCw, Link2 } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Facturacion() {
  const { user } = useAuth();
  const { data: facturas, isLoading } = trpc.invoices.list.useQuery();
  const { data: clientes } = trpc.clientes.list.useQuery();
  const updatePaymentStatus = trpc.invoices.updatePaymentStatus.useMutation();
  const registrarAbono = trpc.invoices.registrarAbono.useMutation();
  const deleteAbono = trpc.invoices.deleteAbono.useMutation();
  const utils = trpc.useUtils();

  // ── State ──────────────────────────────────────────────────────────────────
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<any>(null);
  const [fechaPago, setFechaPago] = useState("");

  // Abono (partial payment) dialog
  const [isAbonoDialogOpen, setIsAbonoDialogOpen] = useState(false);
  const [abonoFactura, setAbonoFactura] = useState<any>(null);
  const [abonoMonto, setAbonoMonto] = useState("");
  const [abonoFecha, setAbonoFecha] = useState(new Date().toISOString().split("T")[0]);
  const [abonoMetodo, setAbonoMetodo] = useState<"Efectivo" | "Transferencia" | "Cheque" | "Tarjeta" | "Otro">("Transferencia");
  const [abonoNotas, setAbonoNotas] = useState("");

  // Pagos history dialog
  const [isPagosDialogOpen, setIsPagosDialogOpen] = useState(false);
  const [pagosFactura, setPagosFactura] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<"mes" | "cliente">("mes");
  const [exportMonth, setExportMonth] = useState("");
  const [exportCliente, setExportCliente] = useState("");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const deleteFactura = trpc.facturas.delete.useMutation();
  const regenerateFactura = trpc.facturas.regenerate.useMutation();
  const linkAnuncios = trpc.facturas.linkAnuncios.useMutation();
  const { data: allAnuncios } = trpc.paradas.list.useQuery();
  const archiveFactura = trpc.invoices.archive.useMutation();
  const unarchiveFactura = trpc.invoices.unarchive.useMutation();
  const generateReport = trpc.invoices.generateReport.useMutation();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Regenerate state
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  // Link anuncios dialog
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkFactura, setLinkFactura] = useState<any>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [selectedAnuncioIds, setSelectedAnuncioIds] = useState<number[]>([]);

  const handleOpenLinkDialog = (factura: any) => {
    setLinkFactura(factura);
    setLinkSearch(factura.cliente || "");
    setSelectedAnuncioIds([]);
    setIsLinkDialogOpen(true);
  };

  const handleLinkAnuncios = async () => {
    if (!linkFactura || selectedAnuncioIds.length === 0) {
      toast.error("Seleccione al menos un anuncio");
      return;
    }
    try {
      await linkAnuncios.mutateAsync({ facturaId: linkFactura.id, anuncioIds: selectedAnuncioIds });
      toast.success(`${selectedAnuncioIds.length} anuncio(s) vinculado(s). Ahora puede regenerar la factura.`);
      setIsLinkDialogOpen(false);
      utils.invoices.list.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Error al vincular anuncios");
    }
  };

  const handleRegenerate = async (factura: any) => {
    if (!factura.anuncioIdsJson) {
      toast.error("Esta factura no tiene anuncios vinculados. Use el botón 🔗 primero.");
      return;
    }
    setRegeneratingId(factura.id);
    try {
      const result = await regenerateFactura.mutateAsync({ facturaId: factura.id });
      toast.success("Factura regenerada correctamente");
      utils.invoices.list.invalidate();
      if (result.pdfUrl) window.open(result.pdfUrl, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Error al regenerar factura");
    } finally {
      setRegeneratingId(null);
    }
  };

  // Email invoice dialog
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailFactura, setEmailFactura] = useState<any>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const sendInvoiceEmail = trpc.invoices.sendByEmail.useMutation();

  const handleOpenEmailDialog = (factura: any) => {
    setEmailFactura(factura);
    // Pre-fill email from client profile if available
    const clienteProfile = clientes?.find(
      (c: any) => c.nombre?.toLowerCase().trim() === factura.cliente?.toLowerCase().trim()
    );
    setEmailTo(clienteProfile?.email || "");
    setEmailCc("");
    setEmailSubject(`Factura ${factura.numeroFactura} - Streetview Media PR`);
    setEmailMessage(`Estimado/a ${factura.cliente},\n\nAdjunto encontrará la factura ${factura.numeroFactura} correspondiente a sus servicios de publicidad exterior con Streetview Media PR.\n\nPara cualquier consulta, no dude en comunicarse con nosotros.\n\nAtentamente,\nEquipo Streetview Media PR`);
    setIsEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailFactura || !emailTo) return;
    if (!emailFactura.pdfUrl) {
      toast.error("Esta factura no tiene PDF generado. Genera el PDF primero.");
      return;
    }
    try {
      await sendInvoiceEmail.mutateAsync({
        facturaId: emailFactura.id,
        to: emailTo,
        cc: emailCc || undefined,
        subject: emailSubject,
        message: emailMessage,
      });
      toast.success(`Factura enviada a ${emailTo}`);
      setIsEmailDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al enviar el correo");
    }
  };

  // Query pagos for the selected factura in the history dialog
  const { data: pagosData, refetch: refetchPagos } = trpc.invoices.listPagos.useQuery(
    { facturaId: pagosFactura?.id ?? 0 },
    { enabled: !!pagosFactura }
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMarkAsPaid = (factura: any) => {
    setSelectedFactura(factura);
    setFechaPago(new Date().toISOString().split("T")[0]);
    setIsPaymentDialogOpen(true);
  };

  const handleOpenAbono = (factura: any) => {
    setAbonoFactura(factura);
    setAbonoMonto("");
    setAbonoFecha(new Date().toISOString().split("T")[0]);
    setAbonoMetodo("Transferencia");
    setAbonoNotas("");
    setIsAbonoDialogOpen(true);
  };

  const handleOpenPagos = (factura: any) => {
    setPagosFactura(factura);
    setIsPagosDialogOpen(true);
  };

  const confirmRegistrarAbono = () => {
    const monto = parseFloat(abonoMonto);
    if (!abonoMonto || isNaN(monto) || monto <= 0) {
      toast.error("Ingrese un monto válido mayor a 0");
      return;
    }
    if (!abonoFecha) {
      toast.error("Seleccione una fecha de pago");
      return;
    }

    const totalFactura = parseFloat(abonoFactura?.total || "0");
    if (monto > totalFactura) {
      toast.error(`El abono ($${monto.toFixed(2)}) no puede superar el total de la factura ($${totalFactura.toFixed(2)})`);
      return;
    }

    registrarAbono.mutate(
      {
        facturaId: abonoFactura.id,
        monto,
        fechaPago: abonoFecha,
        metodoPago: abonoMetodo,
        notas: abonoNotas || undefined,
      },
      {
        onSuccess: (data: any) => {
          const msg = data.nuevoEstado === "Pagada"
            ? "¡Factura marcada como Pagada! El abono completó el total."
            : `Abono registrado. Balance restante: $${data.balance.toFixed(2)}`;
          toast.success(msg);
          setIsAbonoDialogOpen(false);
          utils.invoices.list.invalidate();
          if (pagosFactura?.id === abonoFactura.id) refetchPagos();
        },
        onError: (error: any) => {
          toast.error(error.message || "Error al registrar el abono");
        },
      }
    );
  };

  const handleDeleteAbono = (pagoId: number) => {
    if (!confirm("¿Eliminar este abono? El balance de la factura se recalculará.")) return;
    deleteAbono.mutate(
      { pagoId },
      {
        onSuccess: () => {
          toast.success("Abono eliminado");
          utils.invoices.list.invalidate();
          refetchPagos();
        },
        onError: (error: any) => {
          toast.error(error.message || "Error al eliminar el abono");
        },
      }
    );
  };

  const handleDeleteFactura = (facturaId: number, numeroFactura: string) => {
    if (!confirm(`¿Está seguro de eliminar la factura ${numeroFactura}?`)) return;
    deleteFactura.mutate(
      { id: facturaId },
      {
        onSuccess: () => {
          toast.success("Factura eliminada correctamente");
          utils.invoices.list.invalidate();
        },
        onError: (error: any) => {
          toast.error(error.message || "Error al eliminar factura");
        },
      }
    );
  };

  const handleArchiveFactura = (facturaId: number, numeroFactura: string) => {
    if (!confirm(`¿Archivar la factura ${numeroFactura}?`)) return;
    archiveFactura.mutate(
      { facturaId },
      {
        onSuccess: () => {
          toast.success("Factura archivada correctamente");
          utils.invoices.list.invalidate();
        },
        onError: (error: any) => {
          toast.error(error.message || "Error al archivar factura");
        },
      }
    );
  };

  const handleUnarchiveFactura = (facturaId: number, _: string) => {
    unarchiveFactura.mutate(
      { facturaId },
      {
        onSuccess: () => {
          toast.success("Factura restaurada correctamente");
          utils.invoices.list.invalidate();
        },
        onError: (error: any) => {
          toast.error(error.message || "Error al restaurar factura");
        },
      }
    );
  };

  const handleExportReportPDF = async () => {
    if (filteredFacturas.length === 0) {
      toast.error("No hay facturas para exportar con los filtros actuales");
      return;
    }
    setIsGeneratingReport(true);
    const parts: string[] = [];
    if (searchTerm) parts.push(`Búsqueda: "${searchTerm}"`);
    if (dateFilterStart) parts.push(`Desde: ${dateFilterStart}`);
    if (dateFilterEnd) parts.push(`Hasta: ${dateFilterEnd}`);
    if (showArchived) parts.push("Archivadas");
    const filtroDescripcion = parts.length > 0 ? parts.join(" | ") : "Todas las facturas";
    const facturaIds = filteredFacturas.map((f: any) => f.id);
    generateReport.mutate(
      { facturaIds, filtroDescripcion },
      {
        onSuccess: (data: any) => {
          setIsGeneratingReport(false);
          fetch(data.pdfUrl)
            .then(r => r.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `Reporte-Facturacion-${new Date().toISOString().split("T")[0]}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              toast.success("Reporte PDF generado correctamente");
            })
            .catch(() => {
              window.open(data.pdfUrl, "_blank");
              toast.success("Reporte PDF generado correctamente");
            });
        },
        onError: (error: any) => {
          setIsGeneratingReport(false);
          toast.error(error.message || "Error al generar el reporte PDF");
        },
      }
    );
  };

  const handleExportReport = () => {
    if (exportType === "mes" && !exportMonth) { toast.error("Debe seleccionar un mes"); return; }
    if (exportType === "cliente" && !exportCliente) { toast.error("Debe ingresar un cliente"); return; }
    let filtered = facturas || [];
    if (exportType === "mes") {
      const [year, month] = exportMonth.split("-");
      filtered = filtered.filter((f: any) => {
        const d = new Date(f.createdAt);
        return d.getFullYear() === parseInt(year) && d.getMonth() + 1 === parseInt(month);
      });
    } else {
      filtered = filtered.filter((f: any) => f.cliente.toLowerCase().includes(exportCliente.toLowerCase()));
    }
    if (filtered.length === 0) { toast.error("No hay facturas para exportar"); return; }
    const headers = ["No. Factura", "Cliente", "Fecha", "Total", "Estado", "Fecha Pago", "Vendedor"];
    const rows = filtered.map((f: any) => [
      f.numeroFactura, f.cliente, formatDateDisplay(f.createdAt),
      parseFloat(f.total).toFixed(2), f.estadoPago,
      f.fechaPago ? formatDateDisplay(f.fechaPago) : "-", f.vendedor || "-",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_facturas_${exportType === "mes" ? exportMonth : exportCliente}_${new Date().toISOString().split("T")[0]}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Reporte exportado correctamente");
    setIsExportDialogOpen(false);
  };

  const confirmMarkAsPaid = () => {
    if (!selectedFactura || !fechaPago) { toast.error("Debe seleccionar una fecha de pago"); return; }
    updatePaymentStatus.mutate(
      { facturaId: selectedFactura.id, estadoPago: "Pagada", fechaPago: new Date(fechaPago).toISOString() },
      {
        onSuccess: () => {
          toast.success("Factura marcada como pagada");
          setIsPaymentDialogOpen(false);
          setSelectedFactura(null);
          setFechaPago("");
          utils.invoices.list.invalidate();
        },
        onError: (error: any) => {
          toast.error(error.message || "Error al actualizar estado de pago");
        },
      }
    );
  };

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredFacturas = useMemo(() => {
    if (!facturas) return [];
    let filtered = facturas;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((f: any) =>
        f.numeroFactura.toLowerCase().includes(term) ||
        f.cliente.toLowerCase().includes(term) ||
        (f.vendedor && f.vendedor.toLowerCase().includes(term))
      );
    }
    if (dateFilterStart) {
      // Parse as UTC start-of-day to avoid timezone shifting the date
      const startDate = new Date(dateFilterStart + 'T00:00:00.000Z');
      filtered = filtered.filter((f: any) => new Date(f.createdAt) >= startDate);
    }
    if (dateFilterEnd) {
      // Parse as UTC end-of-day so the full selected day is included
      const endDate = new Date(dateFilterEnd + 'T23:59:59.999Z');
      filtered = filtered.filter((f: any) => new Date(f.createdAt) <= endDate);
    }
    filtered = filtered.filter((f: any) => showArchived ? f.archivada === 1 : f.archivada === 0);
    return filtered;
  }, [facturas, searchTerm, dateFilterStart, dateFilterEnd, showArchived]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "Pagada":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">Pagada</Badge>;
      case "Pendiente":
        return <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">Pendiente</Badge>;
      case "Vencida":
        return <Badge className="bg-red-600 hover:bg-red-700 text-white">Vencida</Badge>;
      case "Pago Parcial":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Pago Parcial</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  const formatMoney = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Compute total paid for a factura from the pagos list (used in history dialog)
  const totalPagadoFromList = useMemo(() => {
    if (!pagosData) return 0;
    return pagosData.reduce((acc, p) => acc + parseFloat(p.monto), 0);
  }, [pagosData]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        <div className="container py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Facturación</h1>
                <p className="text-body text-gray-600">Gestión de facturas y pagos</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleExportReportPDF}
                  disabled={isGeneratingReport || !filteredFacturas || filteredFacturas.length === 0}
                  className="bg-[#ff6b35] hover:bg-[#e65a25] text-white"
                >
                  <FileDown size={16} className="mr-2" />
                  {isGeneratingReport ? "Generando PDF..." : "Reporte PDF"}
                </Button>
                <Button
                  onClick={() => setIsExportDialogOpen(true)}
                  className="bg-[#1a4d3c] hover:bg-[#0f3a2a]"
                >
                  <Download size={16} className="mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Buscar por cliente, número de factura o vendedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600 mb-1 block">Fecha Inicio</Label>
                <Input type="date" value={dateFilterStart} onChange={(e) => setDateFilterStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm text-gray-600 mb-1 block">Fecha Fin</Label>
                <Input type="date" value={dateFilterEnd} onChange={(e) => setDateFilterEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateFilterStart(firstDay.toISOString().split('T')[0]);
                setDateFilterEnd(today.toISOString().split('T')[0]);
              }}>Este Mes</Button>
              <Button variant="outline" size="sm" onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                setDateFilterStart(lastMonth.toISOString().split('T')[0]);
                setDateFilterEnd(lastDay.toISOString().split('T')[0]);
              }}>Último Mes</Button>
              <Button variant="outline" size="sm" onClick={() => {
                const today = new Date();
                const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                setDateFilterStart(threeMonthsAgo.toISOString().split('T')[0]);
                setDateFilterEnd(today.toISOString().split('T')[0]);
              }}>Últimos 3 Meses</Button>
              <Button variant="outline" size="sm" onClick={() => { setDateFilterStart(""); setDateFilterEnd(""); setSearchTerm(""); }}>
                Limpiar Filtros
              </Button>
              <Button
                variant={showArchived ? "default" : "outline"}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className={showArchived ? "bg-[#1a4d3c] hover:bg-[#0f3a2a]" : ""}
              >
                {showArchived ? "Ver Activas" : "Ver Archivadas"}
              </Button>
            </div>
          </div>

          {/* Statistics Dashboard */}
          {!isLoading && facturas && facturas.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-5 border-l-4 border-blue-500">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Facturas</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{filteredFacturas?.length || 0}</p>
                <p className="text-xs text-blue-700 mt-1">
                  {formatMoney(filteredFacturas?.reduce((s, f) => s + parseFloat(f.total || "0"), 0) || 0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-5 border-l-4 border-green-500">
                <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Pagadas</p>
                <p className="text-3xl font-bold text-green-900 mt-1">
                  {filteredFacturas?.filter(f => f.estadoPago === "Pagada").length || 0}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {formatMoney(filteredFacturas?.filter(f => f.estadoPago === "Pagada").reduce((s, f) => s + parseFloat(f.total || "0"), 0) || 0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-md p-5 border-l-4 border-blue-400">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Pago Parcial</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  {filteredFacturas?.filter(f => f.estadoPago === "Pago Parcial").length || 0}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {/* Show total abonos received (total - balance remaining) */}
                  {formatMoney(filteredFacturas?.filter(f => f.estadoPago === "Pago Parcial").reduce((s, f) => {
                    const total = parseFloat(f.total || "0");
                    const balance = f.balance != null ? f.balance : total;
                    return s + (total - balance); // abonos recibidos
                  }, 0) || 0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-md p-5 border-l-4 border-orange-500">
                <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">No Pagadas</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">
                  {filteredFacturas?.filter(f => f.estadoPago === "Pendiente" || f.estadoPago === "Vencida" || f.estadoPago === "Pago Parcial").length || 0}
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  {/* Show total balance owed: Pendiente + Vencida full totals + Pago Parcial remaining balance */}
                  {formatMoney(filteredFacturas?.reduce((s, f) => {
                    if (f.estadoPago === "Pagada") return s;
                    const balance = f.balance != null ? f.balance : parseFloat(f.total || "0");
                    return s + balance;
                  }, 0) || 0)}
                </p>
              </div>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-12"><p className="text-gray-600">Cargando facturas...</p></div>
          ) : !filteredFacturas || filteredFacturas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">No hay facturas generadas</p>
              <Link href="/anuncios"><Button>Ir a Gestor de Anuncios</Button></Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Factura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFacturas.map((factura: any) => {
                    const total = parseFloat(factura.total || "0");
                    // Balance comes from backend (total - sum of pagos)
                    const balance = factura.balance != null ? factura.balance : total;
                    const isPagada = factura.estadoPago === "Pagada";
                    const isParcial = factura.estadoPago === "Pago Parcial";
                    const balanceColor = isPagada
                      ? "text-green-600"
                      : isParcial
                      ? "text-blue-600"
                      : "text-orange-600";
                    return (
                      <TableRow key={factura.id} className={isParcial ? "bg-blue-50/40" : ""}>
                        <TableCell className="font-medium">{factura.numeroFactura}</TableCell>
                        <TableCell>{factura.cliente}</TableCell>
                        <TableCell>{formatDateDisplay(factura.createdAt)}</TableCell>
                        <TableCell className="font-semibold">{formatMoney(total)}</TableCell>
                        <TableCell>
                          <span className={`font-semibold text-sm ${balanceColor}`}>
                            {formatMoney(isPagada ? 0 : balance)}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(factura.estadoPago)}</TableCell>
                        <TableCell>{factura.fechaPago ? formatDateDisplay(factura.fechaPago) : "-"}</TableCell>
                        <TableCell>{factura.vendedor || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" variant="outline" onClick={() => window.open(factura.pdfUrl, "_blank")}>
                              <FileText size={14} className="mr-1" />Ver PDF
                            </Button>
                            {factura.pdfUrl && (
                              <Button size="sm" variant="outline" className="border-blue-400 text-blue-700 hover:bg-blue-50" onClick={() => handleOpenEmailDialog(factura)}>
                                <Mail size={14} className="mr-1" />Enviar
                              </Button>
                            )}
                            {/* Regenerate / Link buttons */}
                            {!factura.anuncioIdsJson ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-amber-400 text-amber-700 hover:bg-amber-50"
                                title="Vincular anuncios para poder regenerar"
                                onClick={() => handleOpenLinkDialog(factura)}
                              >
                                <Link2 size={14} className="mr-1" />Vincular
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#1a4d3c] text-[#1a4d3c] hover:bg-green-50"
                                title="Regenerar PDF con el formato actualizado"
                                disabled={regeneratingId === factura.id}
                                onClick={() => handleRegenerate(factura)}
                              >
                                <RefreshCw size={14} className={`mr-1 ${regeneratingId === factura.id ? 'animate-spin' : ''}`} />
                                {regeneratingId === factura.id ? "..." : "Regen."}
                              </Button>
                            )}
                            {factura.estadoPago !== "Pagada" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => handleOpenAbono(factura)}
                                >
                                  <PlusCircle size={14} className="mr-1" />Abono
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleMarkAsPaid(factura)}
                                >
                                  <Check size={14} className="mr-1" />Pagada
                                </Button>
                              </>
                            )}
                            {isParcial && (
                              <Button size="sm" variant="outline" onClick={() => handleOpenPagos(factura)}>
                                <CreditCard size={14} className="mr-1" />Abonos
                              </Button>
                            )}
                            {showArchived ? (
                              <Button size="sm" variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-300"
                                onClick={() => handleUnarchiveFactura(factura.id, factura.numeroFactura)}>
                                Restaurar
                              </Button>
                            ) : (
                              <>
                                {factura.estadoPago === "Pagada" && (
                                  <Button size="sm" variant="outline" className="bg-amber-50 hover:bg-amber-100 border-amber-300"
                                    onClick={() => handleArchiveFactura(factura.id, factura.numeroFactura)}>
                                    Archivar
                                  </Button>
                                )}
                                <Button size="sm" variant="destructive"
                                  onClick={() => handleDeleteFactura(factura.id, factura.numeroFactura)}>
                                  <Trash2 size={14} className="mr-1" />Eliminar
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ── Mark as Paid Dialog ─────────────────────────────────────────── */}
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Marcar Factura como Pagada</DialogTitle>
                <DialogDescription>Confirma el pago total de la factura {selectedFactura?.numeroFactura}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Cliente</Label>
                  <Input value={selectedFactura?.cliente || ""} disabled />
                </div>
                <div>
                  <Label>Total</Label>
                  <Input value={formatMoney(parseFloat(selectedFactura?.total || "0"))} disabled />
                </div>
                <div>
                  <Label>Fecha de Pago</Label>
                  <Input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancelar</Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={confirmMarkAsPaid}>
                  <Check size={16} className="mr-2" />Confirmar Pago Total
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Registrar Abono Dialog ──────────────────────────────────────── */}
          <Dialog open={isAbonoDialogOpen} onOpenChange={setIsAbonoDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Banknote size={20} className="text-blue-600" />
                  Registrar Abono
                </DialogTitle>
                <DialogDescription>
                  Factura {abonoFactura?.numeroFactura} — Total: {formatMoney(parseFloat(abonoFactura?.total || "0"))}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Monto del Abono *</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={abonoMonto}
                      onChange={(e) => setAbonoMonto(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div>
                  <Label>Fecha de Pago *</Label>
                  <Input type="date" value={abonoFecha} onChange={(e) => setAbonoFecha(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Método de Pago *</Label>
                  <Select value={abonoMetodo} onValueChange={(v: any) => setAbonoMetodo(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notas / Referencia</Label>
                  <Input
                    placeholder="Número de cheque, referencia de transferencia..."
                    value={abonoNotas}
                    onChange={(e) => setAbonoNotas(e.target.value)}
                    className="mt-1"
                  />
                </div>
                {abonoMonto && !isNaN(parseFloat(abonoMonto)) && parseFloat(abonoMonto) > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                    <p className="text-blue-800 font-medium">
                      Balance restante estimado:{" "}
                      <span className={parseFloat(abonoFactura?.total || "0") - parseFloat(abonoMonto) <= 0 ? "text-green-700" : "text-blue-700"}>
                        {formatMoney(Math.max(0, parseFloat(abonoFactura?.total || "0") - parseFloat(abonoMonto)))}
                      </span>
                    </p>
                    {parseFloat(abonoFactura?.total || "0") - parseFloat(abonoMonto) <= 0 && (
                      <p className="text-green-700 mt-1">✓ Este abono completará el pago de la factura</p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAbonoDialogOpen(false)}>Cancelar</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={confirmRegistrarAbono}
                  disabled={registrarAbono.isPending}
                >
                  <PlusCircle size={16} className="mr-2" />
                  {registrarAbono.isPending ? "Registrando..." : "Registrar Abono"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Pagos History Dialog ────────────────────────────────────────── */}
          <Dialog open={isPagosDialogOpen} onOpenChange={setIsPagosDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard size={20} className="text-blue-600" />
                  Historial de Abonos
                </DialogTitle>
                <DialogDescription>
                  Factura {pagosFactura?.numeroFactura} — {pagosFactura?.cliente} — Total: {formatMoney(parseFloat(pagosFactura?.total || "0"))}
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                {!pagosData || pagosData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard size={32} className="mx-auto mb-2 opacity-40" />
                    <p>No hay abonos registrados</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Notas</TableHead>
                          <TableHead>Registrado por</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagosData.map((pago) => (
                          <TableRow key={pago.id}>
                            <TableCell>{formatDateDisplay(pago.fechaPago)}</TableCell>
                            <TableCell className="font-semibold text-green-700">{formatMoney(parseFloat(pago.monto))}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{pago.metodoPago}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">{pago.notas || "-"}</TableCell>
                            <TableCell className="text-sm">{pago.registradoPor || "-"}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteAbono(pago.id)}
                              >
                                <X size={14} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {/* Summary */}
                    <div className="mt-4 bg-gray-50 rounded-md p-4 flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Total abonado</p>
                        <p className="text-xl font-bold text-green-700">{formatMoney(totalPagadoFromList)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Balance pendiente</p>
                        <p className={`text-xl font-bold ${Math.max(0, parseFloat(pagosFactura?.total || "0") - totalPagadoFromList) === 0 ? "text-green-700" : "text-orange-600"}`}>
                          {formatMoney(Math.max(0, parseFloat(pagosFactura?.total || "0") - totalPagadoFromList))}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPagosDialogOpen(false)}>Cerrar</Button>
                {pagosFactura?.estadoPago !== "Pagada" && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => { setIsPagosDialogOpen(false); handleOpenAbono(pagosFactura); }}
                  >
                    <PlusCircle size={16} className="mr-2" />Nuevo Abono
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Export CSV Dialog ───────────────────────────────────────────── */}
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exportar Reporte de Facturas</DialogTitle>
                <DialogDescription>Seleccione el tipo de reporte que desea generar</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Tipo de Reporte</Label>
                  <Select value={exportType} onValueChange={(value: "mes" | "cliente") => setExportType(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mes">Por Mes</SelectItem>
                      <SelectItem value="cliente">Por Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {exportType === "mes" && (
                  <div>
                    <Label>Mes</Label>
                    <Input type="month" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} />
                  </div>
                )}
                {exportType === "cliente" && (
                  <div>
                    <Label>Cliente</Label>
                    <Input placeholder="Nombre del cliente" value={exportCliente} onChange={(e) => setExportCliente(e.target.value)} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>Cancelar</Button>
                <Button className="bg-[#1a4d3c] hover:bg-[#0f3a2a]" onClick={handleExportReport}>
                  <Download size={16} className="mr-2" />Exportar CSV
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Link Anuncios Dialog ─────────────────────────────────────── */}
          <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Link2 size={18} className="text-amber-600" />
                  Vincular Anuncios a Factura
                </DialogTitle>
                <DialogDescription>
                  {linkFactura && `Factura ${linkFactura.numeroFactura} — ${linkFactura.cliente}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Buscar por cliente o producto..."
                    value={linkSearch}
                    onChange={e => setLinkSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-gray-500">Seleccione los anuncios que corresponden a esta factura. Se guardarán para poder regenerar el PDF.</p>
                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                  {(allAnuncios || []).filter((a: any) => {
                    const term = linkSearch.toLowerCase();
                    return !term || a.cliente?.toLowerCase().includes(term) || a.producto?.toLowerCase().includes(term);
                  }).map((a: any) => (
                    <label key={a.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAnuncioIds.includes(a.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedAnuncioIds(prev => [...prev, a.id]);
                          else setSelectedAnuncioIds(prev => prev.filter(id => id !== a.id));
                        }}
                      />
                      <span className="text-sm">
                        <span className="font-medium">{a.cliente}</span>
                        <span className="text-gray-500"> — {a.producto} — ${a.costo}</span>
                        <span className="text-xs text-gray-400 ml-2">(ID: {a.id})</span>
                      </span>
                    </label>
                  ))}
                </div>
                {selectedAnuncioIds.length > 0 && (
                  <p className="text-sm text-green-700 font-medium">{selectedAnuncioIds.length} anuncio(s) seleccionado(s)</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Cancelar</Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleLinkAnuncios}
                  disabled={selectedAnuncioIds.length === 0 || linkAnuncios.isPending}
                >
                  <Link2 size={14} className="mr-2" />
                  {linkAnuncios.isPending ? "Vinculando..." : `Vincular ${selectedAnuncioIds.length} anuncio(s)`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Email Invoice Dialog */}
          <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail size={18} className="text-blue-600" />
                  Enviar Factura por Correo
                </DialogTitle>
                <DialogDescription>
                  {emailFactura && `Factura ${emailFactura.numeroFactura} — ${emailFactura.cliente}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Para (email del cliente) *</Label>
                  <Input
                    type="email"
                    placeholder="cliente@empresa.com"
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                  />
                </div>
                <div>
                  <Label>CC (opcional)</Label>
                  <Input
                    type="email"
                    placeholder="copia@empresa.com"
                    value={emailCc}
                    onChange={e => setEmailCc(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Asunto</Label>
                  <Input
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Mensaje</Label>
                  <textarea
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                    value={emailMessage}
                    onChange={e => setEmailMessage(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  El PDF de la factura se adjuntará automáticamente al correo.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancelar</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSendEmail}
                  disabled={!emailTo || sendInvoiceEmail.isPending}
                >
                  <Mail size={14} className="mr-2" />
                  {sendInvoiceEmail.isPending ? "Enviando..." : "Enviar Factura"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </div>
  );
}
