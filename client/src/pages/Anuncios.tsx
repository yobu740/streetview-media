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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Edit, X, ArrowLeft, FileSpreadsheet, Printer, Trash2, FileText } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Anuncios() {
  const { user } = useAuth();
  const { data: anuncios, isLoading } = trpc.anuncios.list.useQuery();
  const { data: paradas } = trpc.paradas.list.useQuery();
  const updateAnuncio = trpc.anuncios.update.useMutation();
  const deleteAnuncio = trpc.anuncios.delete.useMutation();
  const generateInvoice = trpc.invoices.generate.useMutation();
  const utils = trpc.useUtils();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAnuncio, setSelectedAnuncio] = useState<any>(null);
  const [selectedAnuncios, setSelectedAnuncios] = useState<number[]>([]);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
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
  });
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [invoiceTitle, setInvoiceTitle] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [productionCost, setProductionCost] = useState("");
  const [otherServicesDescription, setOtherServicesDescription] = useState("");
  const [otherServicesCost, setOtherServicesCost] = useState("");
  const [salespersonName, setSalespersonName] = useState("");

  const filteredAnuncios = anuncios?.filter((a) => {
    const matchesSearch =
      !searchTerm ||
      a.producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.paradaId.toString().includes(searchTerm) ||
      paradas?.find(p => p.id === a.paradaId)?.cobertizoId?.toString().includes(searchTerm);

    const matchesEstado = filterEstado === "all" || a.estado === filterEstado;
    const matchesTipo = filterTipo === "all" || a.tipo === filterTipo;
    
    // Check if anuncio overlaps with date range
    const matchesDateRange = 
      (!dateRangeStart || new Date(a.fechaFin) >= new Date(dateRangeStart)) &&
      (!dateRangeEnd || new Date(a.fechaInicio) <= new Date(dateRangeEnd));

    return matchesSearch && matchesEstado && matchesTipo && matchesDateRange;
  });

  const getParadaInfo = (paradaId: number) => {
    const parada = paradas?.find((p) => p.id === paradaId);
    return parada
      ? `${parada.cobertizoId} - ${parada.localizacion}`
      : `Parada #${paradaId}`;
  };

  const handleEdit = (anuncio: any) => {
    setSelectedAnuncio(anuncio);
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
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedAnuncio) return;

    if (!editForm.producto || !editForm.cliente || !editForm.fechaInicio || !editForm.fechaFin) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    // Auto-set cost to 0 for Bonificación
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
          // Invalidate both queries to refresh data
          await Promise.all([
            utils.anuncios.list.invalidate(),
            utils.paradas.list.invalidate()
          ]);
        },
        onError: (error) => {
          toast.error(`Error: ${error.message}`);
        },
      }
    );
  };

  const handleGenerateInvoice = async () => {
    if (!filteredAnuncios || filteredAnuncios.length === 0) {
      toast.error("No hay anuncios para facturar. Aplica filtros primero.");
      return;
    }

    // Include only billable estados: Activo, Programado, Finalizado
    // Exclude: Disponible, Inactivo
    const billableAnuncios = filteredAnuncios.filter(a => 
      a.estado === "Activo" || a.estado === "Programado" || a.estado === "Finalizado"
    );
    
    if (billableAnuncios.length === 0) {
      toast.error("No hay anuncios facturables (Activo/Programado/Finalizado) en los filtros actuales.");
      return;
    }

    const anuncioIds = billableAnuncios.map(a => a.id);
    const title = invoiceTitle || `Factura - ${new Date().toLocaleDateString("es-PR")}`;

    generateInvoice.mutate(
      {
        anuncioIds,
        title,
        description: invoiceDescription,
        productionCost: productionCost ? parseFloat(productionCost) : undefined,
        otherServicesDescription: otherServicesDescription || undefined,
        otherServicesCost: otherServicesCost ? parseFloat(otherServicesCost) : undefined,
        salespersonName: salespersonName || undefined,
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
    setFilterEstado("all");
    setFilterTipo("all");
    setDateRangeStart("");
    setDateRangeEnd("");
  };

  const hasActiveFilters = searchTerm || filterEstado !== "all" || filterTipo !== "all" || dateRangeStart || dateRangeEnd;

  const handleExportExcel = () => {
    if (!filteredAnuncios || filteredAnuncios.length === 0) {
      toast.error("No hay anuncios para exportar");
      return;
    }

    const headers = ["ID", "Parada", "Cliente", "Producto", "Tipo", "Fecha Inicio", "Fecha Fin", "Estado", "Costo"];
    const rows = filteredAnuncios.map((a) => [
      a.id,
      getParadaInfo(a.paradaId),
      a.cliente,
      a.producto,
      a.tipo,
      formatDateDisplay(a.fechaInicio),
      formatDateDisplay(a.fechaFin),
      a.estado,
      a.tipo === "Bonificación" ? "Bonificación - Sin Costo" : `$${a.costoPorUnidad || "0.00"}`,
    ]);

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
                <th>Parada</th>
                <th>Cliente</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Estado</th>
                <th>Costo</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAnuncios
                .map(
                  (a) => `
                <tr>
                  <td>${a.id}</td>
                  <td>${getParadaInfo(a.paradaId)}</td>
                  <td>${a.cliente}</td>
                  <td>${a.producto}</td>
                  <td>${a.tipo}</td>
                  <td>${formatDateDisplay(a.fechaInicio)}</td>
                  <td>${formatDateDisplay(a.fechaFin)}</td>
                  <td>${a.estado}</td>
                  <td>${a.tipo === "Bonificación" ? "Bonificación - Sin Costo" : `$${a.costoPorUnidad || "0.00"}`}</td>
                </tr>
              `
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <Input
                  placeholder="Cliente, producto o parada..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Programado">Programado</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
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
                  <Button
                    onClick={() => setIsBulkEditDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit size={16} className="mr-2" />
                    Editar Seleccionados ({selectedAnuncios.length})
                  </Button>
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
              filterEstado === "all" ? "ring-2 ring-[#1a4d3c]" : ""
            }`}
            onClick={() => setFilterEstado("all")}
          >
            <p className="text-sm text-gray-600 mb-1">Total Anuncios</p>
            <p className="text-3xl font-bold text-[#1a4d3c]">
              {filteredAnuncios?.length || 0}
            </p>
          </div>
          <div 
            className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
              filterEstado === "Activo" ? "ring-2 ring-green-600" : ""
            }`}
            onClick={() => setFilterEstado("Activo")}
          >
            <p className="text-sm text-gray-600 mb-1">Activos</p>
            <p className="text-3xl font-bold text-green-600">
              {filteredAnuncios?.filter((a) => a.estado === "Activo").length || 0}
            </p>
          </div>
          <div 
            className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
              filterEstado === "Programado" ? "ring-2 ring-blue-600" : ""
            }`}
            onClick={() => setFilterEstado("Programado")}
          >
            <p className="text-sm text-gray-600 mb-1">Programados</p>
            <p className="text-3xl font-bold text-blue-600">
              {filteredAnuncios?.filter((a) => a.estado === "Programado").length || 0}
            </p>
          </div>
          <div 
            className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
              filterEstado === "Finalizado" ? "ring-2 ring-gray-600" : ""
            }`}
            onClick={() => setFilterEstado("Finalizado")}
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
                  <TableHead>Ubicación</TableHead>
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
                      <TableCell className="max-w-[200px] truncate">
                        {paradas?.find(p => p.id === anuncio.paradaId)?.localizacion || "—"}
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
                        <Badge variant={getEstadoBadgeVariant(anuncio.estado)}>
                          {anuncio.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user?.role === 'admin' ? (
                          <div className="flex gap-2">
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
              <Select
                value={editForm.paradaId?.toString()}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, paradaId: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una parada">
                    {editForm.paradaId && paradas?.find(p => p.id === editForm.paradaId)
                      ? `${paradas.find(p => p.id === editForm.paradaId)?.cobertizoId} [${paradas.find(p => p.id === editForm.paradaId)?.orientacion}] - ${paradas.find(p => p.id === editForm.paradaId)?.localizacion}`
                      : "Selecciona una parada"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {paradas
                    ?.filter((parada) => {
                      // Only show paradas that are available in the selected date range
                      if (!editForm.fechaInicio || !editForm.fechaFin) return true;
                      
                      const startDate = new Date(editForm.fechaInicio);
                      const endDate = new Date(editForm.fechaFin);
                      
                      // Check if parada has any conflicting anuncios (excluding current one)
                      const hasConflict = anuncios?.some((a) => {
                        if (a.id === selectedAnuncio?.id) return false; // Exclude current anuncio
                        if (a.paradaId !== parada.id) return false; // Different parada
                        
                        const aStart = new Date(a.fechaInicio);
                        const aEnd = new Date(a.fechaFin);
                        
                        // Check for date overlap
                        return aStart <= endDate && aEnd >= startDate;
                      });
                      
                      return !hasConflict;
                    })
                    .map((parada) => (
                      <SelectItem key={parada.id} value={parada.id.toString()}>
                        {parada.cobertizoId} [{parada.orientacion}] - {parada.localizacion}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
            <div className="text-sm text-gray-600">
              <p><strong>Anuncios filtrados:</strong> {filteredAnuncios?.length || 0}</p>
              <p><strong>Anuncios facturables (Activo/Programado/Finalizado):</strong> {filteredAnuncios?.filter(a => a.estado === "Activo" || a.estado === "Programado" || a.estado === "Finalizado").length || 0}</p>
              <p><strong>Total estimado:</strong> ${(() => {
                const billable = filteredAnuncios?.filter(a => a.estado === "Activo" || a.estado === "Programado" || a.estado === "Finalizado") || [];
                const subtotal = billable.reduce((sum, a) => {
                  const cost = parseFloat(a.costoPorUnidad || "0");
                  return sum + cost;
                }, 0);
                const prodCost = parseFloat(productionCost || "0");
                const otherCost = parseFloat(otherServicesCost || "0");
                return (subtotal + prodCost + otherCost).toFixed(2);
              })()}</p>
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
