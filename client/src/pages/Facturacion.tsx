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
import { FileText, Check, Calendar, Search, Download, Trash2 } from "lucide-react";
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
  const updatePaymentStatus = trpc.invoices.updatePaymentStatus.useMutation();
  const utils = trpc.useUtils();
  
  // All useState hooks
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<any>(null);
  const [fechaPago, setFechaPago] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<"mes" | "cliente">("mes");
  const [exportMonth, setExportMonth] = useState("");
  const [exportCliente, setExportCliente] = useState("");
  
  // Date range filters
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  
  // Archive toggle
  const [showArchived, setShowArchived] = useState(false);
  
  const deleteFactura = trpc.facturas.delete.useMutation();
  const archiveFactura = trpc.invoices.archive.useMutation();
  const unarchiveFactura = trpc.invoices.unarchive.useMutation();

  const handleMarkAsPaid = (factura: any) => {
    setSelectedFactura(factura);
    setFechaPago(new Date().toISOString().split("T")[0]);
    setIsPaymentDialogOpen(true);
  };

  const handleDeleteFactura = (facturaId: number, numeroFactura: string) => {
    if (!confirm(`¿Está seguro de eliminar la factura ${numeroFactura}?`)) {
      return;
    }
    
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
    if (!confirm(`¿Archivar la factura ${numeroFactura}?`)) {
      return;
    }
    
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
  
  const handleUnarchiveFactura = (facturaId: number, numeroFactura: string) => {
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
  
  const handleExportReport = () => {
    if (exportType === "mes" && !exportMonth) {
      toast.error("Debe seleccionar un mes");
      return;
    }
    if (exportType === "cliente" && !exportCliente) {
      toast.error("Debe ingresar un cliente");
      return;
    }
    
    // Filter facturas based on export type
    let filteredFacturas = facturas || [];
    
    if (exportType === "mes") {
      const [year, month] = exportMonth.split("-");
      filteredFacturas = filteredFacturas.filter((f: any) => {
        const facturaDate = new Date(f.createdAt);
        return (
          facturaDate.getFullYear() === parseInt(year) &&
          facturaDate.getMonth() + 1 === parseInt(month)
        );
      });
    } else {
      filteredFacturas = filteredFacturas.filter((f: any) =>
        f.cliente.toLowerCase().includes(exportCliente.toLowerCase())
      );
    }
    
    if (filteredFacturas.length === 0) {
      toast.error("No hay facturas para exportar con los criterios seleccionados");
      return;
    }
    
    // Generate CSV
    const headers = [
      "No. Factura",
      "Cliente",
      "Fecha",
      "Total",
      "Estado",
      "Fecha Pago",
      "Vendedor",
    ];
    
    const rows = filteredFacturas.map((f: any) => [
      f.numeroFactura,
      f.cliente,
      formatDateDisplay(f.createdAt),
      parseFloat(f.total).toFixed(2),
      f.estadoPago,
      f.fechaPago ? formatDateDisplay(f.fechaPago) : "-",
      f.vendedor || "-",
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `reporte_facturas_${exportType === "mes" ? exportMonth : exportCliente}_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Reporte exportado correctamente");
    setIsExportDialogOpen(false);
  };
  
  const confirmMarkAsPaid = () => {
    if (!selectedFactura || !fechaPago) {
      toast.error("Debe seleccionar una fecha de pago");
      return;
    }

    updatePaymentStatus.mutate(
      {
        facturaId: selectedFactura.id,
        estadoPago: "Pagada",
        fechaPago: new Date(fechaPago).toISOString(),
      },
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

  // Filter facturas based on search term and date range
  const filteredFacturas = useMemo(() => {
    if (!facturas) return [];
    
    let filtered = facturas;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((f: any) =>
        f.numeroFactura.toLowerCase().includes(term) ||
        f.cliente.toLowerCase().includes(term) ||
        (f.vendedor && f.vendedor.toLowerCase().includes(term))
      );
    }
    
    // Apply date range filter
    if (dateFilterStart) {
      const startDate = new Date(dateFilterStart);
      filtered = filtered.filter((f: any) => new Date(f.createdAt) >= startDate);
    }
    
    if (dateFilterEnd) {
      const endDate = new Date(dateFilterEnd);
      endDate.setHours(23, 59, 59, 999); // Include entire end day
      filtered = filtered.filter((f: any) => new Date(f.createdAt) <= endDate);
    }
    
    // Apply archive filter
    filtered = filtered.filter((f: any) => showArchived ? f.archivada === 1 : f.archivada === 0);
    
    return filtered;
  }, [facturas, searchTerm, dateFilterStart, dateFilterEnd, showArchived]);
  
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "Pagada":
        return <Badge className="bg-green-600 hover:bg-green-700">Pagada</Badge>;
      case "Pendiente":
        return <Badge className="bg-yellow-600 hover:bg-yellow-700">Pendiente</Badge>;
      case "Vencida":
        return <Badge className="bg-red-600 hover:bg-red-700">Vencida</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Facturación</h1>
                <p className="text-body text-gray-600">Gestión de facturas y pagos</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsExportDialogOpen(true)}
                  className="bg-[#1a4d3c] hover:bg-[#0f3a2a]"
                >
                  <Download size={16} className="mr-2" />
                  Exportar Reporte
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
                <Input
                  type="date"
                  value={dateFilterStart}
                  onChange={(e) => setDateFilterStart(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600 mb-1 block">Fecha Fin</Label>
                <Input
                  type="date"
                  value={dateFilterEnd}
                  onChange={(e) => setDateFilterEnd(e.target.value)}
                />
              </div>
            </div>
            
            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  setDateFilterStart(firstDay.toISOString().split('T')[0]);
                  setDateFilterEnd(today.toISOString().split('T')[0]);
                }}
              >
                Este Mes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                  setDateFilterStart(lastMonth.toISOString().split('T')[0]);
                  setDateFilterEnd(lastDay.toISOString().split('T')[0]);
                }}
              >
                Último Mes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                  setDateFilterStart(threeMonthsAgo.toISOString().split('T')[0]);
                  setDateFilterEnd(today.toISOString().split('T')[0]);
                }}
              >
                Últimos 3 Meses
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateFilterStart("");
                  setDateFilterEnd("");
                  setSearchTerm("");
                }}
              >
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Total Facturas */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium uppercase tracking-wide">Total Facturas</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{filteredFacturas?.length || 0}</p>
                    <p className="text-sm text-blue-700 mt-1">
                      ${filteredFacturas?.reduce((sum, f) => sum + (parseFloat(f.total || "0")), 0).toFixed(2)}
                    </p>
                  </div>
                  <FileText size={40} className="text-blue-500 opacity-50" />
                </div>
              </div>

              {/* Total Pagadas */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium uppercase tracking-wide">Pagadas</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">
                      {filteredFacturas?.filter(f => f.estadoPago === "Pagada").length || 0}
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      ${filteredFacturas?.filter(f => f.estadoPago === "Pagada").reduce((sum, f) => sum + parseFloat(f.total || "0"), 0).toFixed(2)}
                    </p>
                  </div>
                  <Check size={40} className="text-green-500 opacity-50" />
                </div>
              </div>

              {/* Total No Pagadas */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-md p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium uppercase tracking-wide">No Pagadas</p>
                    <p className="text-3xl font-bold text-orange-900 mt-2">
                      {filteredFacturas?.filter(f => f.estadoPago === "Pendiente" || f.estadoPago === "Vencida").length || 0}
                    </p>
                    <p className="text-sm text-orange-700 mt-1">
                      ${filteredFacturas?.filter(f => f.estadoPago === "Pendiente" || f.estadoPago === "Vencida").reduce((sum, f) => sum + parseFloat(f.total || "0"), 0).toFixed(2)}
                    </p>
                  </div>
                  <Calendar size={40} className="text-orange-500 opacity-50" />
                </div>
              </div>
            </div>
          )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando facturas...</p>
          </div>
        ) : !filteredFacturas || filteredFacturas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No hay facturas generadas</p>
            <Link href="/anuncios">
              <Button>Ir a Gestor de Anuncios</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFacturas.map((factura: any) => (
                  <TableRow key={factura.id}>
                    <TableCell className="font-medium">
                      {factura.numeroFactura}
                    </TableCell>
                    <TableCell>{factura.cliente}</TableCell>
                    <TableCell>
                      {formatDateDisplay(factura.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${parseFloat(factura.total).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{getStatusBadge(factura.estadoPago)}</TableCell>
                    <TableCell>
                      {factura.fechaPago
                        ? formatDateDisplay(factura.fechaPago)
                        : "-"}
                    </TableCell>
                    <TableCell>{factura.vendedor || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(factura.pdfUrl, "_blank")}
                        >
                          <FileText size={16} className="mr-1" />
                          Ver PDF
                        </Button>
                        {factura.estadoPago !== "Pagada" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleMarkAsPaid(factura)}
                          >
                            <Check size={16} className="mr-1" />
                            Marcar Pagada
                          </Button>
                        )}
                        {showArchived ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-blue-50 hover:bg-blue-100 border-blue-300"
                            onClick={() => handleUnarchiveFactura(factura.id, factura.numeroFactura)}
                          >
                            Restaurar
                          </Button>
                        ) : (
                          <>
                            {factura.estadoPago === "Pagada" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-amber-50 hover:bg-amber-100 border-amber-300"
                                onClick={() => handleArchiveFactura(factura.id, factura.numeroFactura)}
                              >
                                Archivar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteFactura(factura.id, factura.numeroFactura)}
                            >
                              <Trash2 size={16} className="mr-1" />
                              Eliminar
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Mark as Paid Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar Factura como Pagada</DialogTitle>
              <DialogDescription>
                Confirma el pago de la factura {selectedFactura?.numeroFactura}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  value={selectedFactura?.cliente || ""}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="total">Total</Label>
                <Input
                  id="total"
                  value={`$${parseFloat(selectedFactura?.total || "0").toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="fecha-pago">Fecha de Pago</Label>
                <Input
                  id="fecha-pago"
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={confirmMarkAsPaid}
              >
                <Check size={16} className="mr-2" />
                Confirmar Pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Export Report Dialog */}
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exportar Reporte de Facturas</DialogTitle>
              <DialogDescription>
                Seleccione el tipo de reporte que desea generar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="export-type">Tipo de Reporte</Label>
                <Select
                  value={exportType}
                  onValueChange={(value: "mes" | "cliente") => setExportType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mes">Por Mes</SelectItem>
                    <SelectItem value="cliente">Por Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {exportType === "mes" && (
                <div>
                  <Label htmlFor="export-month">Mes</Label>
                  <Input
                    id="export-month"
                    type="month"
                    value={exportMonth}
                    onChange={(e) => setExportMonth(e.target.value)}
                  />
                </div>
              )}
              
              {exportType === "cliente" && (
                <div>
                  <Label htmlFor="export-cliente">Cliente</Label>
                  <Input
                    id="export-cliente"
                    placeholder="Nombre del cliente"
                    value={exportCliente}
                    onChange={(e) => setExportCliente(e.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsExportDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-[#1a4d3c] hover:bg-[#0f3a2a]"
                onClick={handleExportReport}
              >
                <Download size={16} className="mr-2" />
                Exportar CSV
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  );
}
