import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import { Search, Edit, X, ArrowLeft, FileSpreadsheet, Printer, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Anuncios() {
  const { data: anuncios, isLoading } = trpc.anuncios.list.useQuery();
  const { data: paradas } = trpc.paradas.list.useQuery();
  const updateAnuncio = trpc.anuncios.update.useMutation();
  const deleteAnuncio = trpc.anuncios.delete.useMutation();
  const utils = trpc.useUtils();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAnuncio, setSelectedAnuncio] = useState<any>(null);
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

  const filteredAnuncios = anuncios?.filter((a) => {
    const matchesSearch =
      !searchTerm ||
      a.producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.paradaId.toString().includes(searchTerm);

    const matchesEstado = filterEstado === "all" || a.estado === filterEstado;
    const matchesTipo = filterTipo === "all" || a.tipo === filterTipo;
    
    const matchesDateRange = 
      (!dateRangeStart || new Date(a.fechaInicio) >= new Date(dateRangeStart)) &&
      (!dateRangeEnd || new Date(a.fechaFin) <= new Date(dateRangeEnd));

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
        onSuccess: () => {
          toast.success("Anuncio actualizado exitosamente");
          setIsEditDialogOpen(false);
          utils.anuncios.list.invalidate();
          utils.paradas.list.invalidate();
        },
        onError: (error) => {
          toast.error(`Error: ${error.message}`);
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

    const headers = ["ID", "Parada", "Cliente", "Producto", "Tipo", "Fecha Inicio", "Fecha Fin", "Estado"];
    const rows = filteredAnuncios.map((a) => [
      a.id,
      getParadaInfo(a.paradaId),
      a.cliente,
      a.producto,
      a.tipo,
      new Date(a.fechaInicio).toLocaleDateString(),
      new Date(a.fechaFin).toLocaleDateString(),
      a.estado,
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
                  <td>${new Date(a.fechaInicio).toLocaleDateString()}</td>
                  <td>${new Date(a.fechaFin).toLocaleDateString()}</td>
                  <td>${a.estado}</td>
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
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
              >
                <X size={16} className="mr-2" />
                Limpiar Filtros
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
                  <TableHead>ID</TableHead>
                  <TableHead>Parada</TableHead>
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
                      <TableCell className="font-medium">{anuncio.id}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {getParadaInfo(anuncio.paradaId)}
                      </TableCell>
                      <TableCell>{anuncio.producto || "—"}</TableCell>
                      <TableCell>{anuncio.cliente || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={anuncio.tipo === "Fijo" ? "default" : "secondary"}>
                          {anuncio.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(anuncio.fechaInicio).toLocaleDateString("es-PR")}
                      </TableCell>
                      <TableCell>
                        {new Date(anuncio.fechaFin).toLocaleDateString("es-PR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEstadoBadgeVariant(anuncio.estado)}>
                          {anuncio.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
                  <SelectValue placeholder="Selecciona una parada" />
                </SelectTrigger>
                <SelectContent>
                  {paradas?.map((parada) => (
                    <SelectItem key={parada.id} value={parada.id.toString()}>
                      {parada.id} [{parada.orientacion}] - {parada.localizacion}
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
      </div>
    </div>
  );
}
