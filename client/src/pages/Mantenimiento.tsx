import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, FileSpreadsheet, Printer, History, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Mantenimiento() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCondicion, setFilterCondicion] = useState<string>("all");
  const [selectedParada, setSelectedParada] = useState<any>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const { data: paradas, refetch: refetchParadas } = trpc.paradas.list.useQuery();
  const { data: history } = trpc.mantenimiento.getHistory.useQuery(
    { paradaId: selectedParada?.id || 0 },
    { enabled: !!selectedParada && isHistoryDialogOpen }
  );

  const utils = trpc.useUtils();
  
  const updateCondicion = trpc.paradas.updateCondicion.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.paradas.list.cancel();
      
      // Snapshot previous value
      const previousParadas = utils.paradas.list.getData();
      
      // Optimistically update to new value
      utils.paradas.list.setData(undefined, (old) => {
        if (!old) return old;
        return old.map((p) => {
          if (p.id === variables.paradaId) {
            return { ...p, ...variables };
          }
          return p;
        });
      });
      
      return { previousParadas };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousParadas) {
        utils.paradas.list.setData(undefined, context.previousParadas);
      }
      toast.error(`Error: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Condición actualizada");
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync
      utils.paradas.list.invalidate();
    },
  });

  // Filter paradas
  const filteredParadas = paradas?.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.cobertizoId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.localizacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.direccion.toLowerCase().includes(searchTerm.toLowerCase());

    const isRenovada = p.condicionPintada && p.condicionArreglada && p.condicionLimpia;
    const matchesCondicion =
      filterCondicion === "all" ||
      (filterCondicion === "renovada" && isRenovada) ||
      (filterCondicion === "pendiente" && !isRenovada) ||
      (filterCondicion === "pintada" && p.condicionPintada) ||
      (filterCondicion === "arreglada" && p.condicionArreglada) ||
      (filterCondicion === "limpia" && p.condicionLimpia);

    return matchesSearch && matchesCondicion;
  });

  const handleToggleCondicion = (paradaId: number, field: string, currentValue: number) => {
    updateCondicion.mutate({
      paradaId,
      [field]: currentValue ? 0 : 1,
    });
  };

  const handleDisplayChange = (paradaId: number, value: "Si" | "No" | "N/A") => {
    updateCondicion.mutate({
      paradaId,
      displayPublicidad: value,
    });
  };

  const handleExportExcel = () => {
    if (!filteredParadas || filteredParadas.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = [
      "ID Cobertizo",
      "Localización",
      "Dirección",
      "Orientación",
      "Pintada",
      "Arreglada",
      "Limpia",
      "Display",
      "Estado General",
    ];

    const rows = filteredParadas.map((p) => [
      p.cobertizoId,
      p.localizacion,
      p.direccion,
      p.orientacion,
      p.condicionPintada ? "Sí" : "No",
      p.condicionArreglada ? "Sí" : "No",
      p.condicionLimpia ? "Sí" : "No",
      p.displayPublicidad,
      p.condicionPintada && p.condicionArreglada && p.condicionLimpia
        ? "Renovada"
        : "Pendiente de renovación",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `mantenimiento_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast.success("Reporte exportado exitosamente");
  };

  const handlePrintReport = () => {
    if (!filteredParadas || filteredParadas.length === 0) {
      toast.error("No hay datos para imprimir");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte de Mantenimiento</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1a4d3c; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #1a4d3c; color: white; }
            tr:nth-child(even) { background-color: #f5f5f5; }
            .renovada { color: green; font-weight: bold; }
            .pendiente { color: orange; font-weight: bold; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>Reporte de Mantenimiento de Paradas</h1>
          <p>Generado: ${new Date().toLocaleString()}</p>
          <p>Total: ${filteredParadas.length} paradas</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Localización</th>
                <th>Dirección</th>
                <th>Orient.</th>
                <th>Pintada</th>
                <th>Arreglada</th>
                <th>Limpia</th>
                <th>Display</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${filteredParadas
                .map((p) => {
                  const isRenovada =
                    p.condicionPintada && p.condicionArreglada && p.condicionLimpia;
                  return `
                <tr>
                  <td>${p.cobertizoId}</td>
                  <td>${p.localizacion}</td>
                  <td>${p.direccion}</td>
                  <td>${p.orientacion}</td>
                  <td>${p.condicionPintada ? "✓" : "✗"}</td>
                  <td>${p.condicionArreglada ? "✓" : "✗"}</td>
                  <td>${p.condicionLimpia ? "✓" : "✗"}</td>
                  <td>${p.displayPublicidad}</td>
                  <td class="${isRenovada ? "renovada" : "pendiente"}">
                    ${isRenovada ? "Renovada" : "Pendiente"}
                  </td>
                </tr>
              `;
                })
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

  // Stats
  const stats = {
    total: filteredParadas?.length || 0,
    renovadas:
      filteredParadas?.filter(
        (p) => p.condicionPintada && p.condicionArreglada && p.condicionLimpia
      ).length || 0,
    pendientes:
      filteredParadas?.filter(
        (p) => !(p.condicionPintada && p.condicionArreglada && p.condicionLimpia)
      ).length || 0,
    displayFuncional: filteredParadas?.filter((p) => p.displayPublicidad === "Si").length || 0,
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <AdminSidebar />

      <div className="flex-1 min-w-0">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Mantenimiento</h1>
            <p className="text-body text-gray-600">
              Gestiona el estado y condición de todas las paradas
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-1">Total Paradas</p>
              <p className="text-3xl font-bold text-[#1a4d3c]">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-1">Renovadas</p>
              <p className="text-3xl font-bold text-green-600">{stats.renovadas}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-1">Pendientes</p>
              <p className="text-3xl font-bold text-orange-600">{stats.pendientes}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-1">Display Funcional</p>
              <p className="text-3xl font-bold text-blue-600">{stats.displayFuncional}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label>Buscar</Label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <Input
                    placeholder="ID, localización o dirección..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>Filtrar por Condición</Label>
                <Select value={filterCondicion} onValueChange={setFilterCondicion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="renovada">Renovadas</SelectItem>
                    <SelectItem value="pendiente">Pendientes de renovación</SelectItem>
                    <SelectItem value="pintada">Pintadas</SelectItem>
                    <SelectItem value="arreglada">Arregladas</SelectItem>
                    <SelectItem value="limpia">Limpias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700">
                <FileSpreadsheet size={16} className="mr-2" />
                Exportar Excel
              </Button>
              <Button onClick={handlePrintReport} className="bg-[#1a4d3c] hover:bg-[#0f3a2a]">
                <Printer size={16} className="mr-2" />
                Imprimir Reporte
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Cobertizo</TableHead>
                    <TableHead>Localización</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Orient.</TableHead>
                    <TableHead>Pintada</TableHead>
                    <TableHead>Arreglada</TableHead>
                    <TableHead>Limpia</TableHead>
                    <TableHead>Display</TableHead>
                    <TableHead>Estado General</TableHead>
                    <TableHead>Historial</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParadas && filteredParadas.length > 0 ? (
                    filteredParadas.map((parada) => {
                      const isRenovada =
                        parada.condicionPintada &&
                        parada.condicionArreglada &&
                        parada.condicionLimpia;
                      return (
                        <TableRow key={parada.id}>
                          <TableCell className="font-medium">{parada.cobertizoId}</TableCell>
                          <TableCell>{parada.localizacion}</TableCell>
                          <TableCell className="max-w-xs truncate">{parada.direccion}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {parada.orientacion}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() =>
                                user?.role === 'admin' && handleToggleCondicion(
                                  parada.id,
                                  "condicionPintada",
                                  parada.condicionPintada
                                )
                              }
                              disabled={user?.role !== 'admin'}
                              className={`flex items-center gap-1 transition-opacity ${user?.role === 'admin' ? 'hover:opacity-70 cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                            >
                              {parada.condicionPintada ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() =>
                                user?.role === 'admin' && handleToggleCondicion(
                                  parada.id,
                                  "condicionArreglada",
                                  parada.condicionArreglada
                                )
                              }
                              disabled={user?.role !== 'admin'}
                              className={`flex items-center gap-1 transition-opacity ${user?.role === 'admin' ? 'hover:opacity-70 cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                            >
                              {parada.condicionArreglada ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() =>
                                user?.role === 'admin' && handleToggleCondicion(
                                  parada.id,
                                  "condicionLimpia",
                                  parada.condicionLimpia
                                )
                              }
                              disabled={user?.role !== 'admin'}
                              className={`flex items-center gap-1 transition-opacity ${user?.role === 'admin' ? 'hover:opacity-70 cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                            >
                              {parada.condicionLimpia ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={parada.displayPublicidad}
                              onValueChange={(value: "Si" | "No" | "N/A") =>
                                user?.role === 'admin' && handleDisplayChange(parada.id, value)
                              }
                              disabled={user?.role !== 'admin'}
                            >
                              <SelectTrigger className="w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Si">Si</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                                <SelectItem value="N/A">N/A</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isRenovada ? "default" : "secondary"}>
                              {isRenovada ? "Renovada" : "Pendiente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedParada(parada);
                                setIsHistoryDialogOpen(true);
                              }}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                        No se encontraron paradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Historial de Mantenimiento</DialogTitle>
            <DialogDescription>
              Parada: {selectedParada?.cobertizoId} - {selectedParada?.localizacion}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {history && history.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Cambio</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-sm">
                        {new Date(h.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{h.userName || "Sistema"}</TableCell>
                      <TableCell className="text-sm capitalize">{h.campoModificado}</TableCell>
                      <TableCell className="text-sm">
                        {h.valorAnterior} → {h.valorNuevo}
                      </TableCell>
                      <TableCell className="text-sm">{h.notas || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No hay historial de cambios para esta parada
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
