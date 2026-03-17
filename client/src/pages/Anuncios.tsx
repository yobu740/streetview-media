import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { formatDateDisplay } from "@/lib/dateUtils";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Edit, X, ArrowLeft, FileSpreadsheet, Printer, Trash2, FileText, History, ChevronsUpDown, Check } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useState, useEffect } from "react";

export default function Anuncios() {
  const { user } = useAuth();
  const { data: anuncios, isLoading } = trpc.anuncios.list.useQuery();
  const { data: paradas } = trpc.paradas.list.useQuery();
  const { data: flowcats } = trpc.paradas.getFlowcats.useQuery();
  const { data: instalacionesPendientes = [] } = trpc.instalaciones.list.useQuery();
  // Build a Set of anuncioIds that have a pending instalacion (Programado or Relocalizacion)
  const pendingInstalacionAnuncioIds = new Set(
    instalacionesPendientes
      .filter(i => i.estado === 'Programado' || i.estado === 'Relocalizacion')
      .map(i => i.anuncioId)
  );
  const updateAnuncio = trpc.anuncios.update.useMutation();
  const deleteAnuncio = trpc.anuncios.delete.useMutation();
  const generateInvoice = trpc.invoices.generate.useMutation();
  const utils = trpc.useUtils();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string[]>([]);  // multi-select
  const toggleEstadoFilter = (estado: string) => {
    setFilterEstado(prev =>
      prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]
    );
  };
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterFlowcat, setFilterFlowcat] = useState<string>("all");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAnuncio, setSelectedAnuncio] = useState<any>(null);
  const [selectedAnuncios, setSelectedAnuncios] = useState<number[]>([]);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    paradaId: 0,
    producto: "",
    cliente: "",
    fechaInicio: "",
    fechaFin: "",
    estado: "Activo" as "Disponible" | "Activo" | "Programado" | "Finalizado" | "Inactivo",
    tipo: "Fijo" as "Fijo" | "Bonificación",
    costoPorUnidad: "",
    notas: "",
    motivoRelocalizacion: "",
  });
  const [originalParadaId, setOriginalParadaId] = useState<number | null>(null);
  const [isParadaComboboxOpen, setIsParadaComboboxOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [invoiceTitle, setInvoiceTitle] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [productionCost, setProductionCost] = useState("");
  const [otherServicesDescription, setOtherServicesDescription] = useState("");
  const [otherServicesCost, setOtherServicesCost] = useState("");
  const [salespersonName, setSalespersonName] = useState("");
  const [selectedInvoiceClient, setSelectedInvoiceClient] = useState("");
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedAnuncioForHistory, setSelectedAnuncioForHistory] = useState<number | null>(null);
  const [highlightAnuncioId, setHighlightAnuncioId] = useState<number | null>(null);

  // Installation confirmation dialog: shown when changing Programado -> Activo/Finalizado
  const [installConfirmDialog, setInstallConfirmDialog] = useState<{
    open: boolean;
    anuncioId: number | null;
    cobertizoId: string;
    orientacion: string;
    direccion: string;
    flowCat: string | null;
    onConfirmSave: (() => void) | null;
  }>({ open: false, anuncioId: null, cobertizoId: '', orientacion: '', direccion: '', flowCat: null, onConfirmSave: null });

  const confirmInstalled = trpc.instalaciones.confirmInstalled.useMutation();

  // Support ?anuncioId=X URL param from Mantenimiento relocalizar button
  const searchString = useSearch();
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const anuncioIdParam = params.get("anuncioId");
    if (anuncioIdParam) {
      const id = parseInt(anuncioIdParam, 10);
      if (!isNaN(id)) {
        setHighlightAnuncioId(id);
      }
    }
  }, [searchString]);

  // Auto-open edit dialog when anuncios load and a highlight ID is set
  useEffect(() => {
    if (!highlightAnuncioId || !anuncios) return;
    const target = anuncios.find((a: any) => a.id === highlightAnuncioId);
    if (target) {
      setSelectedAnuncio(target);
      setEditForm({
        paradaId: target.paradaId,
        producto: target.producto || "",
        cliente: target.cliente || "",
        fechaInicio: target.fechaInicio ? new Date(target.fechaInicio).toISOString().split("T")[0] : "",
        fechaFin: target.fechaFin ? new Date(target.fechaFin).toISOString().split("T")[0] : "",
        estado: target.estado || "Activo",
        tipo: target.tipo || "Fijo",
        costoPorUnidad: target.costoPorUnidad?.toString() || "",
        notas: target.notas || "",
        motivoRelocalizacion: "",
      });
      setOriginalParadaId(target.paradaId);
      setIsEditDialogOpen(true);
      setHighlightAnuncioId(null); // clear so it doesn't re-open
    }
  }, [highlightAnuncioId, anuncios]);
  
  // Query history for selected anuncio
  const { data: historyData } = trpc.anuncios.getHistory.useQuery(
    { anuncioId: selectedAnuncioForHistory! },
    { enabled: !!selectedAnuncioForHistory }
  );

  const filteredAnuncios = anuncios?.filter((a) => {
    const searchTerms = searchTerm.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const matchesSearch =
      searchTerms.length === 0 ||
      searchTerms.some(term =>
        a.producto?.toLowerCase().includes(term) ||
        a.cliente?.toLowerCase().includes(term) ||
        a.paradaId.toString().includes(term) ||
        paradas?.find(p => p.id === a.paradaId)?.cobertizoId?.toString().includes(term)
      );

    const matchesEstado = filterEstado.length === 0 || filterEstado.includes(a.estado);
    const matchesTipo = filterTipo === "all" || a.tipo === filterTipo;
    const paradaForFlowcat = paradas?.find(p => p.id === a.paradaId);
    const matchesFlowcat = filterFlowcat === "all" || paradaForFlowcat?.flowCat === filterFlowcat;
    
    // Check if anuncio overlaps with date range
    const matchesDateRange = 
      (!dateRangeStart || new Date(a.fechaFin) >= new Date(dateRangeStart)) &&
      (!dateRangeEnd || new Date(a.fechaInicio) <= new Date(dateRangeEnd));

    return matchesSearch && matchesEstado && matchesTipo && matchesDateRange && matchesFlowcat;
  });

  const getParadaInfo = (paradaId: number) => {
    const parada = paradas?.find((p) => p.id === paradaId);
    return parada
      ? `${parada.cobertizoId} - ${parada.localizacion}`
      : `Parada #${paradaId}`;
  };

  const handleEdit = (anuncio: any) => {
    setSelectedAnuncio(anuncio);
    setOriginalParadaId(anuncio.paradaId);
    setEditForm({
      paradaId: anuncio.paradaId,
      producto: anuncio.producto || "",
      cliente: anuncio.cliente || "",
      fechaInicio: new Date(anuncio.fechaInicio).toISOString().split("T")[0],
      fechaFin: new Date(anuncio.fechaFin).toISOString().split("T")[0],
      estado: anuncio.estado,
      tipo: anuncio.tipo,
      costoPorUnidad: anuncio.costoPorUnidad?.toString() || "",
      notas: anuncio.notas || "",
      motivoRelocalizacion: "",
    });
    setIsEditDialogOpen(true);
  };

  const doSaveEdit = () => {
    if (!selectedAnuncio) return;
    const finalCost = editForm.tipo === "Bonificación" ? 0 : parseFloat(editForm.costoPorUnidad) || 0;
    updateAnuncio.mutate(
      {
        id: selectedAnuncio.id,
        paradaId: editForm.paradaId,
        producto: editForm.producto,
        cliente: editForm.cliente,
        fechaInicio: new Date(editForm.fechaInicio),
        fechaFin: new Date(editForm.fechaFin),
        estado: editForm.estado,
        tipo: editForm.tipo,
        costoPorUnidad: finalCost,
        notas: editForm.notas,
      },
      {
        onSuccess: async () => {
          toast.success("Anuncio actualizado exitosamente");
          setIsEditDialogOpen(false);
          await Promise.all([
            utils.anuncios.list.invalidate(),
            utils.paradas.list.invalidate(),
            utils.instalaciones.list.invalidate(),
            utils.instalaciones.historial.invalidate(),
          ]);
        },
        onError: (error) => {
          toast.error(`Error: ${error.message}`);
        },
      }
    );
  };

  const handleSaveEdit = async () => {
    if (!selectedAnuncio) return;

    if (!editForm.producto || !editForm.cliente || !editForm.fechaInicio || !editForm.fechaFin) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    // If changing a Programado anuncio to Activo or Finalizado, and it has a pending instalacion,
    // ask the user if the physical installation was done
    const wasProgamado = selectedAnuncio.estado === 'Programado';
    const isChangingToActiveOrFinished = editForm.estado === 'Activo' || editForm.estado === 'Finalizado';

    if (wasProgamado && isChangingToActiveOrFinished && pendingInstalacionAnuncioIds.has(selectedAnuncio.id)) {
      try {
        const result = await utils.client.instalaciones.checkPendingInstalacion.query({ anuncioId: selectedAnuncio.id });
        if (result) {
          setInstallConfirmDialog({
            open: true,
            anuncioId: selectedAnuncio.id,
            cobertizoId: result.cobertizoId,
            orientacion: result.orientacion,
            direccion: result.direccion,
            flowCat: result.flowCat,
            onConfirmSave: doSaveEdit,
          });
          return; // Wait for user response in dialog
        }
      } catch (e) {
        console.error('[InstallCheck] Failed to check pending instalacion:', e);
      }
    }

    doSaveEdit();
  };

  const handleGenerateInvoice = async () => {
    if (!filteredAnuncios || filteredAnuncios.length === 0) {
      toast.error("No hay anuncios para facturar. Aplica filtros primero.");
      return;
    }

    // Include only billable estados: Activo, Programado, Finalizado
    // Exclude: Disponible, Inactivo
    let billableAnuncios = filteredAnuncios.filter(a => 
      a.estado === "Activo" || a.estado === "Programado" || a.estado === "Finalizado"
    );
    
    // If a specific client is selected, filter to only that client's anuncios
    if (selectedInvoiceClient && selectedInvoiceClient !== "__all__") {
      billableAnuncios = billableAnuncios.filter(a => a.cliente === selectedInvoiceClient);
    }
    
    if (billableAnuncios.length === 0) {
      const msg = selectedInvoiceClient 
        ? `No hay anuncios facturables para el cliente "${selectedInvoiceClient}"`
        : "No hay anuncios facturables (Activo/Programado/Finalizado) en los filtros actuales.";
      toast.error(msg);
      return;
    }

    const anuncioIds = billableAnuncios.map(a => a.id);
    const title = invoiceTitle || `Factura - ${new Date().toLocaleDateString("es-PR")}`;

    // Determine the client name for the invoice header
    // If "__all__" is selected or no specific client, use "Todos los clientes"
    const clienteNombre = (!selectedInvoiceClient || selectedInvoiceClient === "__all__")
      ? "Todos los clientes"
      : selectedInvoiceClient;

    generateInvoice.mutate(
      {
        anuncioIds,
        title,
        description: invoiceDescription,
        productionCost: productionCost ? parseFloat(productionCost) : undefined,
        otherServicesDescription: otherServicesDescription || undefined,
        otherServicesCost: otherServicesCost ? parseFloat(otherServicesCost) : undefined,
        salespersonName: salespersonName || undefined,
        clienteNombre,
      },
      {
        onSuccess: (data: any) => {
          // Download PDF using fetch to avoid popup blockers
          fetch(data.pdfUrl)
            .then(response => response.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `Factura-${Date.now()}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            })
            .catch(err => {
              console.error('Download failed:', err);
              // Fallback: open in new tab
              window.open(data.pdfUrl, '_blank');
            });
          
          toast.success("Factura generada exitosamente");
          setIsInvoiceDialogOpen(false);
          setInvoiceTitle("");
          setInvoiceDescription("");
          setProductionCost("");
          setOtherServicesDescription("");
          setOtherServicesCost("");
          setSalespersonName("");
          setSelectedInvoiceClient("");
        },
        onError: (error: any) => {
          toast.error(error.message || "Error al generar factura");
        },
      }
    );
  };

  const handleDelete = (anuncio: any) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el anuncio #${anuncio.id} de ${anuncio.producto}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    deleteAnuncio.mutate(
      { id: anuncio.id },
      {
        onSuccess: () => {
          toast.success("Anuncio eliminado exitosamente");
          utils.anuncios.list.invalidate();
          utils.paradas.list.invalidate();
        },
        onError: (error) => {
          toast.error(`Error al eliminar: ${error.message}`);
        },
      }
    );
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case "Activo":
        return "default";
      case "Programado":
        return "secondary";
      case "Finalizado":
        return "outline";
      case "Inactivo":
        return "destructive";
      default:
        return "outline";
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterEstado([]);
    setFilterTipo("all");
    setFilterFlowcat("all");
    setDateRangeStart("");
    setDateRangeEnd("");
  };

  const hasActiveFilters = searchTerm || filterEstado.length > 0 || filterTipo !== "all" || filterFlowcat !== "all" || dateRangeStart || dateRangeEnd;

  const handleBulkDelete = () => {
    Promise.all(
      selectedAnuncios.map(id => deleteAnuncio.mutateAsync({ id }))
    ).then(() => {
      toast.success(`${selectedAnuncios.length} anuncio(s) eliminado(s)`);
      setSelectedAnuncios([]);
      setShowBulkDeleteConfirm(false);
      utils.anuncios.list.invalidate();
    }).catch(() => {
      toast.error("Error al eliminar algunos anuncios");
      setShowBulkDeleteConfirm(false);
    });
  };

  const handleExportExcel = () => {
    if (!filteredAnuncios || filteredAnuncios.length === 0) {
      toast.error("No hay anuncios para exportar");
      return;
    }

    const headers = ["ID", "Cobertizo", "Localización", "Orientación", "Dirección", "Latitud", "Longitud", "Cliente", "Producto", "Tipo", "Fecha Inicio", "Fecha Fin", "Estado", "Costo", "Notas"];
    const rows = filteredAnuncios.map((a) => {
      const parada = paradas?.find(p => p.id === a.paradaId);
      return [
        a.id,
        parada?.cobertizoId || a.paradaId,
        parada?.localizacion || "",
        parada?.orientacion || "N/A",
        parada?.direccion || parada?.localizacion || "",
        parada?.coordenadasLat || "",
        parada?.coordenadasLng || "",
        a.cliente,
        a.producto,
        a.tipo,
        formatDateDisplay(a.fechaInicio),
        formatDateDisplay(a.fechaFin),
        a.estado,
        a.tipo === "Bonificación" ? "Bonificación - Sin Costo" : `$${a.costoPorUnidad || "0.00"}`,
        a.notas || "",
      ];
    });

    let csv = headers.join(",") + "\n";
    rows.forEach((row) => {
      csv += row.map((cell) => `"${cell}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `anuncios_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast.success("Anuncios exportados exitosamente");
  };

  const handlePrintReport = () => {
    if (!filteredAnuncios || filteredAnuncios.length === 0) {
      toast.error("No hay anuncios para imprimir");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte de Anuncios</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1a4d3c; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #1a4d3c; color: white; }
            tr:nth-child(even) { background-color: #f5f5f5; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>Reporte de Anuncios</h1>
          <p>Generado: ${new Date().toLocaleString()}</p>
          <p>Total: ${filteredAnuncios.length} anuncios</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cobertizo</th>
                <th>Localización</th>
                <th>Orientación</th>
                <th>Dirección</th>
                <th>Latitud</th>
                <th>Longitud</th>
                <th>Cliente</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Estado</th>
                <th>Costo</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAnuncios
                .map(
                  (a) => {
                    const parada = paradas?.find(p => p.id === a.paradaId);
                    return `
                <tr>
                  <td>${a.id}</td>
                  <td>${parada?.cobertizoId || a.paradaId}</td>
                  <td>${parada?.localizacion || ""}</td>
                  <td>${parada?.orientacion || "N/A"}</td>
                  <td>${parada?.direccion || parada?.localizacion || ""}</td>
                  <td>${parada?.coordenadasLat || ""}</td>
                  <td>${parada?.coordenadasLng || ""}</td>
                  <td>${a.cliente}</td>
                  <td>${a.producto}</td>
                  <td>${a.tipo}</td>
                  <td>${formatDateDisplay(a.fechaInicio)}</td>
                  <td>${formatDateDisplay(a.fechaFin)}</td>
                  <td>${a.estado}</td>
                  <td>${a.tipo === "Bonificación" ? "Bonificación - Sin Costo" : `$${a.costoPorUnidad || "0.00"}`}</td>
                  <td>${a.notas || ""}</td>
                </tr>
              `;
                  }
                )
                .join("")}
            </tbody>
          </table>
          <button onclick="window.print()">Imprimir</button>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    toast.success("Reporte generado");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <p className="text-gray-500">Cargando anuncios...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      {/* Sidebar */}
      <AdminSidebar />
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="container py-8">
          <div className="mb-8">
          <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">
            Gestión de Anuncios
          </h1>
          <p className="text-body text-gray-600">
            Administra todos los anuncios, clientes, productos y fechas
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <Input
                  placeholder="Cliente, producto o parada... (separa con comas)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <div className="flex flex-wrap gap-1 pt-1">
                {["Activo", "Programado", "Finalizado", "Inactivo"].map(estado => (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => toggleEstadoFilter(estado)}
                    className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                      filterEstado.includes(estado)
                        ? estado === "Activo" ? "bg-green-600 text-white border-green-600"
                          : estado === "Programado" ? "bg-blue-600 text-white border-blue-600"
                          : estado === "Finalizado" ? "bg-gray-600 text-white border-gray-600"
                          : "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {estado}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Fijo">Fijo</SelectItem>
                  <SelectItem value="Bonificación">Bonificación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Flowcat / Ruta</Label>
              <Select value={filterFlowcat} onValueChange={setFilterFlowcat}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las rutas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las rutas</SelectItem>
                  {flowcats?.map((fc) => (
                    <SelectItem key={fc.flowCat} value={fc.flowCat}>
                      <span className="font-mono font-bold text-[#1a4d3c] mr-2">{fc.flowCat}</span>
                      <span className="text-gray-600 truncate">{fc.localizacion}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha Inicio (desde)</Label>
              <Input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
              />
            </div>
            <div>
              <Label>Fecha Fin (hasta)</Label>
              <Input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
              >
                <X size={16} className="mr-2" />
                Limpiar Filtros
              </Button>
            )}
            {user?.role === 'admin' && (
              <>
                {selectedAnuncios.length > 0 && (
                  <>
                    <Button
                      onClick={() => setIsBulkEditDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit size={16} className="mr-2" />
                      Editar Seleccionados ({selectedAnuncios.length})
                    </Button>
                    <Button
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Eliminar Seleccionados ({selectedAnuncios.length})
                    </Button>
                  </>
                )}
                <Button
                  onClick={handleExportExcel}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <FileSpreadsheet size={16} className="mr-2" />
                  Exportar Excel
                </Button>
                <Button
                  onClick={handlePrintReport}
                  className="bg-[#1a4d3c] hover:bg-[#0f3a2a]"
                >
                  <Printer size={16} className="mr-2" />
                  Imprimir Reporte
                </Button>
                <Button
                  onClick={() => setIsInvoiceDialogOpen(true)}
                  className="bg-[#ff6b35] hover:bg-[#e65a25]"
                >
                  <FileText size={16} className="mr-2" />
                  Generar Factura
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div 
            className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
              filterEstado.length === 0 ? "ring-2 ring-[#1a4d3c]" : ""
            }`}
            onClick={() => setFilterEstado([])}
          >
            <p className="text-sm text-gray-600 mb-1">Total Anuncios</p>
            <p className="text-3xl font-bold text-[#1a4d3c]">
              {filteredAnuncios?.length || 0}
            </p>
          </div>
          <div 
            className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
              filterEstado.includes("Activo") ? "ring-2 ring-green-600" : ""
            }`}
            onClick={() => toggleEstadoFilter("Activo")}
          >
            <p className="text-sm text-gray-600 mb-1">Activos</p>
            <p className="text-3xl font-bold text-green-600">
              {filteredAnuncios?.filter((a) => a.estado === "Activo").length || 0}
            </p>
          </div>
          <div 
            className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
              filterEstado.includes("Programado") ? "ring-2 ring-blue-600" : ""
            }`}
            onClick={() => toggleEstadoFilter("Programado")}
          >
            <p className="text-sm text-gray-600 mb-1">Programados</p>
            <p className="text-3xl font-bold text-blue-600">
              {filteredAnuncios?.filter((a) => a.estado === "Programado").length || 0}
            </p>
          </div>
          <div 
            className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
              filterEstado.includes("Finalizado") ? "ring-2 ring-gray-600" : ""
            }`}
            onClick={() => toggleEstadoFilter("Finalizado")}
          >
            <p className="text-sm text-gray-600 mb-1">Finalizados</p>
            <p className="text-3xl font-bold text-gray-600">
              {filteredAnuncios?.filter((a) => a.estado === "Finalizado").length || 0}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedAnuncios.length === filteredAnuncios?.length && filteredAnuncios.length > 0}
                      onChange={(e) => {
                        if (e.target.checked && filteredAnuncios) {
                          setSelectedAnuncios(filteredAnuncios.map(a => a.id));
                        } else {
                          setSelectedAnuncios([]);
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>Cobertizo</TableHead>
                  <TableHead>Orient.</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Fecha Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnuncios && filteredAnuncios.length > 0 ? (
                  filteredAnuncios.map((anuncio) => (
                    <TableRow key={anuncio.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedAnuncios.includes(anuncio.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAnuncios([...selectedAnuncios, anuncio.id]);
                            } else {
                              setSelectedAnuncios(selectedAnuncios.filter(id => id !== anuncio.id));
                            }
                          }}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {paradas?.find(p => p.id === anuncio.paradaId)?.cobertizoId || anuncio.paradaId}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-xs font-semibold">
                          {paradas?.find(p => p.id === anuncio.paradaId)?.orientacion || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {paradas?.find(p => p.id === anuncio.paradaId)?.direccion || paradas?.find(p => p.id === anuncio.paradaId)?.localizacion || "—"}
                      </TableCell>
                      <TableCell>{anuncio.producto || "—"}</TableCell>
                      <TableCell>{anuncio.cliente || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={anuncio.tipo === "Fijo" ? "default" : "secondary"}>
                          {anuncio.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDateDisplay(anuncio.fechaInicio)}
                      </TableCell>
                      <TableCell>
                        {formatDateDisplay(anuncio.fechaFin)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={getEstadoBadgeVariant(anuncio.estado)}>
                            {anuncio.estado}
                          </Badge>
                          {pendingInstalacionAnuncioIds.has(anuncio.id) && (
                            <span
                              title="Pendiente de instalación"
                              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-white"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
                                <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 3a1 1 0 011 1v5.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 0111 12V6a1 1 0 011-1z"/>
                              </svg>
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user?.role === 'admin' ? (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAnuncioForHistory(anuncio.id);
                                setIsHistoryDialogOpen(true);
                              }}
                              title="Ver Historial"
                            >
                              <History size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(anuncio)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(anuncio)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      No se encontraron anuncios
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Anuncio #{selectedAnuncio?.id}</DialogTitle>
            <DialogDescription>
              Modifica la información del anuncio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-parada">Parada *</Label>
              <Popover open={isParadaComboboxOpen} onOpenChange={setIsParadaComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isParadaComboboxOpen}
                    className="w-full justify-between font-normal bg-background"
                  >
                    <span className="truncate">
                      {editForm.paradaId && paradas?.find(p => p.id === editForm.paradaId)
                        ? (() => {
                            const p = paradas.find(p => p.id === editForm.paradaId)!;
                            return `${p.cobertizoId} [${p.orientacion}] - ${p.localizacion}`;
                          })()
                        : "Selecciona una parada..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar parada por nombre, dirección o ID..." />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>No se encontró ninguna parada.</CommandEmpty>
                      <CommandGroup>
                        {paradas
                          ?.filter((parada) => {
                            if (!editForm.fechaInicio || !editForm.fechaFin) return true;
                            const startDate = new Date(editForm.fechaInicio);
                            const endDate = new Date(editForm.fechaFin);
                            const hasConflict = anuncios?.some((a) => {
                              if (a.id === selectedAnuncio?.id) return false;
                              if (a.paradaId !== parada.id) return false;
                              const aStart = new Date(a.fechaInicio);
                              const aEnd = new Date(a.fechaFin);
                              return aStart <= endDate && aEnd >= startDate;
                            });
                            return !hasConflict;
                          })
                          .map((parada) => (
                            <CommandItem
                              key={parada.id}
                              value={`${parada.cobertizoId} ${parada.orientacion} ${parada.localizacion} ${parada.direccion || ""}`}
                              onSelect={() => {
                                setEditForm({ ...editForm, paradaId: parada.id });
                                setIsParadaComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${editForm.paradaId === parada.id ? "opacity-100" : "opacity-0"}`}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{parada.cobertizoId} [{parada.orientacion}]</span>
                                <span className="text-xs text-muted-foreground">{parada.localizacion}{parada.direccion ? ` - ${parada.direccion}` : ""}</span>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Relocation Warning */}
              {originalParadaId && editForm.paradaId !== originalParadaId && (
                <div className="mt-3 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
                  <div className="flex items-start">
                    <span className="text-amber-600 text-xl mr-2">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-800 mb-1">
                        Estás relocalizando este anuncio
                      </p>
                      <p className="text-sm text-amber-700">
                        De: <span className="font-medium">{paradas?.find(p => p.id === originalParadaId)?.localizacion || `Parada #${originalParadaId}`}</span>
                        <br />
                        A: <span className="font-medium">{paradas?.find(p => p.id === editForm.paradaId)?.localizacion || `Parada #${editForm.paradaId}`}</span>
                      </p>
                      <div className="mt-3">
                        <Label htmlFor="motivo-relocalizacion" className="text-amber-800">Motivo de relocalización (opcional)</Label>
                        <Input
                          id="motivo-relocalizacion"
                          placeholder="Ej: Cliente solicitó cambio de ubicación"
                          value={editForm.motivoRelocalizacion}
                          onChange={(e) => setEditForm({ ...editForm, motivoRelocalizacion: e.target.value })}
                          className="mt-1 bg-white border-amber-300 focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="edit-producto">Producto *</Label>
              <Input
                id="edit-producto"
                value={editForm.producto}
                onChange={(e) =>
                  setEditForm({ ...editForm, producto: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-cliente">Cliente *</Label>
              <Input
                id="edit-cliente"
                value={editForm.cliente}
                onChange={(e) =>
                  setEditForm({ ...editForm, cliente: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-fechaInicio">Fecha Inicio *</Label>
                <Input
                  id="edit-fechaInicio"
                  type="date"
                  value={editForm.fechaInicio}
                  onChange={(e) =>
                    setEditForm({ ...editForm, fechaInicio: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-fechaFin">Fecha Fin *</Label>
                <Input
                  id="edit-fechaFin"
                  type="date"
                  value={editForm.fechaFin}
                  onChange={(e) =>
                    setEditForm({ ...editForm, fechaFin: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-tipo">Tipo</Label>
                <Select
                  value={editForm.tipo}
                  onValueChange={(value: "Fijo" | "Bonificación") =>
                    setEditForm({ ...editForm, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fijo">Fijo</SelectItem>
                    <SelectItem value="Bonificación">Bonificación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-costo">Costo por Unidad ($)</Label>
                <Input
                  id="edit-costo"
                  type="number"
                  step="0.01"
                  value={editForm.costoPorUnidad}
                  onChange={(e) =>
                    setEditForm({ ...editForm, costoPorUnidad: e.target.value })
                  }
                  placeholder="350.00"
                  disabled={editForm.tipo === "Bonificación"}
                />
                {editForm.tipo === "Bonificación" && (
                  <p className="text-sm text-gray-500 mt-1">Las bonificaciones no tienen costo</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-estado">Estado</Label>
                <Select
                  value={editForm.estado}
                  onValueChange={(
                    value: "Disponible" | "Activo" | "Programado" | "Finalizado" | "Inactivo"
                  ) => setEditForm({ ...editForm, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Programado">Programado</SelectItem>
                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-notas">Notas</Label>
              <Input
                id="edit-notas"
                value={editForm.notas}
                onChange={(e) =>
                  setEditForm({ ...editForm, notas: e.target.value })
                }
                placeholder="Notas adicionales..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#ff6b35] hover:bg-[#e65a25]"
              onClick={handleSaveEdit}
              disabled={updateAnuncio.isPending}
            >
              {updateAnuncio.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Generation Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generar Factura de Anuncios Filtrados</DialogTitle>
            <DialogDescription>
              Se generará una factura con los {filteredAnuncios?.length || 0} anuncios actualmente filtrados
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="invoice-client">Cliente</Label>
              <Select value={selectedInvoiceClient} onValueChange={setSelectedInvoiceClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente (opcional - todos si vacío)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los clientes</SelectItem>
                  {Array.from(new Set(filteredAnuncios?.filter(a => a.estado === "Activo" || a.estado === "Programado" || a.estado === "Finalizado").map(a => a.cliente))).sort().map(cliente => (
                    <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="invoice-title">Título de Factura (opcional)</Label>
              <Input
                id="invoice-title"
                value={invoiceTitle}
                onChange={(e) => setInvoiceTitle(e.target.value)}
                placeholder="Ej: Factura Mensual - Enero 2026"
              />
            </div>
            <div>
              <Label htmlFor="invoice-description">Descripción (opcional)</Label>
              <Input
                id="invoice-description"
                value={invoiceDescription}
                onChange={(e) => setInvoiceDescription(e.target.value)}
                placeholder="Ej: Servicios de publicidad exterior"
              />
            </div>
            <div>
              <Label htmlFor="production-cost">Costo de Producción (opcional)</Label>
              <Input
                id="production-cost"
                type="number"
                step="0.01"
                value={productionCost}
                onChange={(e) => setProductionCost(e.target.value)}
                placeholder="Ej: 500.00"
              />
            </div>
            <div>
              <Label htmlFor="other-services-desc">Otros Servicios - Descripción (opcional)</Label>
              <Input
                id="other-services-desc"
                value={otherServicesDescription}
                onChange={(e) => setOtherServicesDescription(e.target.value)}
                placeholder="Ej: Instalación y mantenimiento"
              />
            </div>
            <div>
              <Label htmlFor="other-services-cost">Otros Servicios - Costo (opcional)</Label>
              <Input
                id="other-services-cost"
                type="number"
                step="0.01"
                value={otherServicesCost}
                onChange={(e) => setOtherServicesCost(e.target.value)}
                placeholder="Ej: 250.00"
              />
            </div>
            <div>
              <Label htmlFor="salesperson-name">Nombre del Vendedor (opcional)</Label>
              <Input
                id="salesperson-name"
                value={salespersonName}
                onChange={(e) => setSalespersonName(e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            {/* Preview of billable ads */}
            <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
              <h4 className="font-semibold text-sm mb-3">Vista Previa de Anuncios a Facturar</h4>
              {(() => {
                let billable = filteredAnuncios?.filter(a => a.estado === "Activo" || a.estado === "Programado" || a.estado === "Finalizado") || [];
                if (selectedInvoiceClient && selectedInvoiceClient !== "__all__") {
                  billable = billable.filter(a => a.cliente === selectedInvoiceClient);
                }
                
                if (billable.length === 0) {
                  return <p className="text-sm text-gray-500 italic">No hay anuncios facturables con los filtros actuales</p>;
                }
                
                return (
                  <div className="space-y-2">
                    {billable.map((a, idx) => (
                      <div key={a.id} className="flex justify-between items-start text-xs bg-white p-2 rounded border">
                        <div className="flex-1">
                          <p className="font-medium">{idx + 1}. {a.producto}</p>
                          <p className="text-gray-600">{a.cliente} - Parada #{a.paradaId}</p>
                          <p className="text-gray-500">{formatDateDisplay(a.fechaInicio)} a {formatDateDisplay(a.fechaFin)}</p>
                        </div>
                        <div className="text-right font-semibold">
                          ${parseFloat(a.costoPorUnidad || "0").toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            
            {/* Totals Summary */}
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal (Anuncios):</span>
                <span className="font-semibold">${(() => {
                  let billable = filteredAnuncios?.filter(a => a.estado === "Activo" || a.estado === "Programado" || a.estado === "Finalizado") || [];
                  if (selectedInvoiceClient && selectedInvoiceClient !== "__all__") {
                    billable = billable.filter(a => a.cliente === selectedInvoiceClient);
                  }
                  const subtotal = billable.reduce((sum, a) => sum + parseFloat(a.costoPorUnidad || "0"), 0);
                  return subtotal.toFixed(2);
                })()}</span>
              </div>
              {productionCost && parseFloat(productionCost) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Costo de Producción:</span>
                  <span className="font-semibold">${parseFloat(productionCost).toFixed(2)}</span>
                </div>
              )}
              {otherServicesCost && parseFloat(otherServicesCost) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Otros Servicios:</span>
                  <span className="font-semibold">${parseFloat(otherServicesCost).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>TOTAL:</span>
                <span className="text-[#1a4d3c]">${(() => {
                  let billable = filteredAnuncios?.filter(a => a.estado === "Activo" || a.estado === "Programado" || a.estado === "Finalizado") || [];
                  if (selectedInvoiceClient && selectedInvoiceClient !== "__all__") {
                    billable = billable.filter(a => a.cliente === selectedInvoiceClient);
                  }
                  const subtotal = billable.reduce((sum, a) => sum + parseFloat(a.costoPorUnidad || "0"), 0);
                  const prodCost = parseFloat(productionCost || "0");
                  const otherCost = parseFloat(otherServicesCost || "0");
                  return (subtotal + prodCost + otherCost).toFixed(2);
                })()}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#ff6b35] hover:bg-[#e65a25]"
              onClick={handleGenerateInvoice}
              disabled={!filteredAnuncios || filteredAnuncios.length === 0 || generateInvoice.isPending}
            >
              {generateInvoice.isPending ? "Generando..." : "Generar PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Anuncios Seleccionados</DialogTitle>
            <DialogDescription>
              Editando {selectedAnuncios.length} anuncio(s). Los campos deshabilitados requieren que todos los anuncios seleccionados tengan el mismo valor.
            </DialogDescription>
          </DialogHeader>
          <BulkEditForm 
            selectedAnuncios={selectedAnuncios}
            anuncios={anuncios || []}
            onClose={() => {
              setIsBulkEditDialogOpen(false);
              setSelectedAnuncios([]);
            }}
            onSuccess={() => {
              utils.anuncios.list.invalidate();
              setIsBulkEditDialogOpen(false);
              setSelectedAnuncios([]);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Eliminar Anuncios Seleccionados
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>{selectedAnuncios.length} anuncio(s)</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleBulkDelete}
              disabled={deleteAnuncio.isPending}
            >
              {deleteAnuncio.isPending ? "Eliminando..." : `Eliminar ${selectedAnuncios.length} anuncio(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de Cambios del Anuncio</DialogTitle>
            <DialogDescription>
              Registro completo de todos los cambios realizados a este anuncio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!historyData || historyData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History size={48} className="mx-auto mb-4 opacity-50" />
                <p>No hay historial registrado para este anuncio</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyData.map((entry: any, idx: number) => (
                  <div key={entry.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {entry.accion}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.fecha).toLocaleString('es-PR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700">
                          {entry.userName || 'Usuario desconocido'}
                        </p>
                      </div>
                    </div>
                    {entry.detalles && (
                      <div className="mt-2 text-sm text-gray-600 bg-white p-2 rounded border">
                        <pre className="whitespace-pre-wrap font-sans">{entry.detalles}</pre>
                      </div>
                    )}
                    {entry.campoModificado && (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Campo:</span>
                          <span className="ml-1 font-medium">{entry.campoModificado}</span>
                        </div>
                        {entry.valorAnterior && (
                          <div>
                            <span className="text-gray-500">Anterior:</span>
                            <span className="ml-1 line-through text-red-600">{entry.valorAnterior}</span>
                          </div>
                        )}
                        {entry.valorNuevo && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Nuevo:</span>
                            <span className="ml-1 text-green-600 font-medium">{entry.valorNuevo}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Installation Confirmation Dialog */}
      {/* Shown when changing a Programado anuncio to Activo/Finalizado and it has a pending instalacion */}
      <Dialog
        open={installConfirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setInstallConfirmDialog(prev => ({ ...prev, open: false }));
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1a4d3c]">
              <span className="text-2xl">&#x1F6A8;</span> ¿Este anuncio fue instalado?
            </DialogTitle>
            <DialogDescription>
              Este anuncio estaba <strong>Programado</strong> y tiene una instalación pendiente en el área de instalaciones.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-blue-800 mb-2">Instalación pendiente:</p>
              <p className="text-blue-700">
                <span className="font-medium">Cobertizo:</span> {installConfirmDialog.cobertizoId} [{installConfirmDialog.orientacion}]
              </p>
              {installConfirmDialog.flowCat && (
                <p className="text-blue-700">
                  <span className="font-medium">Flowcat:</span> {installConfirmDialog.flowCat}
                </p>
              )}
              <p className="text-blue-700 mt-1">{installConfirmDialog.direccion}</p>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Si el anuncio <strong>sí fue instalado físicamente</strong>, haz clic en “Sí, fue instalado” para registrarlo en el historial de instalaciones.
              Si aún no ha sido instalado, haz clic en “No, solo cambiar estado”.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setInstallConfirmDialog(prev => ({ ...prev, open: false }));
                installConfirmDialog.onConfirmSave?.();
              }}
            >
              No, solo cambiar estado
            </Button>
            <Button
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white"
              disabled={confirmInstalled.isPending}
              onClick={async () => {
                if (!installConfirmDialog.anuncioId) return;
                try {
                  await confirmInstalled.mutateAsync({ anuncioId: installConfirmDialog.anuncioId });
                  toast.success("✅ Instalación registrada en el historial");
                } catch (e: any) {
                  toast.error(`Error al registrar instalación: ${e.message}`);
                }
                setInstallConfirmDialog(prev => ({ ...prev, open: false }));
                installConfirmDialog.onConfirmSave?.();
              }}
            >
              {confirmInstalled.isPending ? "Registrando..." : "✅ Sí, fue instalado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

// Bulk Edit Form Component
function BulkEditForm({ 
  selectedAnuncios, 
  anuncios, 
  onClose, 
  onSuccess 
}: { 
  selectedAnuncios: number[];
  anuncios: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const bulkUpdate = trpc.anuncios.bulkUpdate.useMutation();
  
  const selectedAnunciosData = anuncios.filter(a => selectedAnuncios.includes(a.id));
  
  // Check if all selected have same producto
  const allSameProducto = selectedAnunciosData.every(a => a.producto === selectedAnunciosData[0]?.producto);
  // Check if all selected have same cliente
  const allSameCliente = selectedAnunciosData.every(a => a.cliente === selectedAnunciosData[0]?.cliente);
  
  const [formData, setFormData] = useState({
    tipo: "",
    fechaFin: "",
    estado: "",
    producto: allSameProducto ? selectedAnunciosData[0]?.producto || "" : "",
    cliente: allSameCliente ? selectedAnunciosData[0]?.cliente || "" : "",
  });
  
  const handleSubmit = () => {
    const updates: any = {};
    
    if (formData.tipo) updates.tipo = formData.tipo;
    if (formData.fechaFin) updates.fechaFin = new Date(formData.fechaFin);
    if (formData.estado) updates.estado = formData.estado;
    if (formData.producto && allSameProducto) updates.producto = formData.producto;
    if (formData.cliente && allSameCliente) updates.cliente = formData.cliente;
    
    if (Object.keys(updates).length === 0) {
      toast.error("Por favor selecciona al menos un campo para editar");
      return;
    }
    
    bulkUpdate.mutate(
      { anuncioIds: selectedAnuncios, updates },
      {
        onSuccess: () => {
          toast.success(`${selectedAnuncios.length} anuncio(s) actualizado(s)`);
          onSuccess();
        },
        onError: (error: any) => {
          toast.error("Error al actualizar anuncios: " + error.message);
        },
      }
    );
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="bulk-tipo">Tipo</Label>
        <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
          <SelectTrigger id="bulk-tipo">
            <SelectValue placeholder="No cambiar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Fijo">Fijo</SelectItem>
            <SelectItem value="Digital">Digital</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="bulk-fechaFin">Fecha Final</Label>
        <Input
          id="bulk-fechaFin"
          type="date"
          value={formData.fechaFin}
          onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="bulk-estado">Estado</Label>
        <Select value={formData.estado} onValueChange={(v) => setFormData({ ...formData, estado: v })}>
          <SelectTrigger id="bulk-estado">
            <SelectValue placeholder="No cambiar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Programado">Programado</SelectItem>
            <SelectItem value="Activo">Activo</SelectItem>
            <SelectItem value="Finalizado">Finalizado</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="bulk-producto">
          Producto {!allSameProducto && "(Deshabilitado - productos diferentes)"}
        </Label>
        <Input
          id="bulk-producto"
          value={formData.producto}
          onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
          disabled={!allSameProducto}
          placeholder={allSameProducto ? "Editar producto" : "Productos diferentes"}
        />
      </div>
      
      <div>
        <Label htmlFor="bulk-cliente">
          Cliente {!allSameCliente && "(Deshabilitado - clientes diferentes)"}
        </Label>
        <Input
          id="bulk-cliente"
          value={formData.cliente}
          onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
          disabled={!allSameCliente}
          placeholder={allSameCliente ? "Editar cliente" : "Clientes diferentes"}
        />
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={bulkUpdate.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {bulkUpdate.isPending ? "Actualizando..." : "Aplicar Cambios"}
        </Button>
      </DialogFooter>
    </div>
  );
}
