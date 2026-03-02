import { useState, useEffect } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, FileSpreadsheet, Printer, History, CheckCircle2, XCircle, HardHat, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Mantenimiento() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCondicion, setFilterCondicion] = useState<string>("all");
  const [selectedParada, setSelectedParada] = useState<any>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  // En Construccion dialog state
  const [isConstruccionDialogOpen, setIsConstruccionDialogOpen] = useState(false);
  const [construccionParada, setConstruccionParada] = useState<any>(null);
  const [fechaDisponibilidad, setFechaDisponibilidad] = useState<string>("");
  const [activeAnunciosForParada, setActiveAnunciosForParada] = useState<any[]>([]);
  const [loadingAnunciosCheck, setLoadingAnunciosCheck] = useState(false);

  const { data: paradas, refetch: refetchParadas } = trpc.paradas.list.useQuery();
  const { data: anunciosByParada } = trpc.anuncios.getByParadaId.useQuery(
    { paradaId: construccionParada?.id || 0 },
    { enabled: !!construccionParada && !construccionParada.enConstruccion && isConstruccionDialogOpen }
  );
  const { data: history } = trpc.mantenimiento.getHistory.useQuery(
    { paradaId: selectedParada?.id || 0 },
    { enabled: !!selectedParada && isHistoryDialogOpen }
  );

  const utils = trpc.useUtils();

  const updateCondicion = trpc.paradas.updateCondicion.useMutation({
    onMutate: async (variables) => {
      await utils.paradas.list.cancel();
      const previousParadas = utils.paradas.list.getData();
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
      if (context?.previousParadas) {
        utils.paradas.list.setData(undefined, context.previousParadas);
      }
      toast.error(`Error: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Condición actualizada");
    },
    onSettled: () => {
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
      (filterCondicion === "pendiente" && !isRenovada && !p.enConstruccion) ||
      (filterCondicion === "construccion" && p.enConstruccion) ||
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

  const openConstruccionDialog = (parada: any) => {
    setConstruccionParada(parada);
    setActiveAnunciosForParada([]);
    // Pre-fill date if already set
    if (parada.fechaDisponibilidad) {
      const d = new Date(parada.fechaDisponibilidad);
      setFechaDisponibilidad(d.toISOString().split("T")[0]);
    } else {
      setFechaDisponibilidad("");
    }
    setIsConstruccionDialogOpen(true);
  };

  // When anuncios load for the selected parada, filter active/programado ones
  useEffect(() => {
    if (!anunciosByParada || construccionParada?.enConstruccion) return;
    const now = new Date();
    const active = anunciosByParada.filter(
      (a: any) =>
        (a.estado === "Activo" || a.estado === "Programado") &&
        a.approvalStatus === "approved" &&
        new Date(a.fechaFin) >= now
    );
    setActiveAnunciosForParada(active);
  }, [anunciosByParada, construccionParada]);

  const handleSetConstruccion = () => {
    if (!construccionParada) return;

    // Activating "En construcción" requires a date
    if (!construccionParada.enConstruccion && !fechaDisponibilidad) {
      toast.error("Por favor ingresa la fecha estimada de disponibilidad");
      return;
    }

    const isActivating = !construccionParada.enConstruccion;

    updateCondicion.mutate(
      {
        paradaId: construccionParada.id,
        enConstruccion: isActivating ? 1 : 0,
        fechaDisponibilidad: isActivating && fechaDisponibilidad
          ? new Date(fechaDisponibilidad + "T00:00:00")
          : null,
      },
      {
        onSuccess: () => {
          toast.success(
            isActivating
              ? "Cara marcada como En construcción"
              : "Estado En construcción removido"
          );
          setIsConstruccionDialogOpen(false);
          setConstruccionParada(null);
          setFechaDisponibilidad("");
        },
      }
    );
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
      "En Construcción",
      "Fecha Disponibilidad",
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
      p.enConstruccion ? "Sí" : "No",
      p.fechaDisponibilidad
        ? new Date(p.fechaDisponibilidad).toLocaleDateString("es-PR")
        : "",
      p.enConstruccion
        ? "En Construcción"
        : p.condicionPintada && p.condicionArreglada && p.condicionLimpia
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
            .construccion { color: #b45309; font-weight: bold; }
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
                <th>Fecha Disponibilidad</th>
              </tr>
            </thead>
            <tbody>
              ${filteredParadas
                .map((p) => {
                  const isRenovada =
                    p.condicionPintada && p.condicionArreglada && p.condicionLimpia;
                  const estadoClass = p.enConstruccion
                    ? "construccion"
                    : isRenovada
                    ? "renovada"
                    : "pendiente";
                  const estadoLabel = p.enConstruccion
                    ? "En Construcción"
                    : isRenovada
                    ? "Renovada"
                    : "Pendiente";
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
                  <td class="${estadoClass}">${estadoLabel}</td>
                  <td>${p.fechaDisponibilidad && p.enConstruccion ? new Date(p.fechaDisponibilidad).toLocaleDateString('es-PR') : '—'}</td>
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
        (p) => !p.enConstruccion && p.condicionPintada && p.condicionArreglada && p.condicionLimpia
      ).length || 0,
    pendientes:
      filteredParadas?.filter(
        (p) => !p.enConstruccion && !(p.condicionPintada && p.condicionArreglada && p.condicionLimpia)
      ).length || 0,
    enConstruccion: filteredParadas?.filter((p) => p.enConstruccion).length || 0,
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-500">
              <p className="text-sm text-gray-600 mb-1">En Construcción</p>
              <p className="text-3xl font-bold text-amber-600">{stats.enConstruccion}</p>
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
                    placeholder="Buscar por ID, localización o dirección..."
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
                    <SelectItem value="construccion">En Construcción</SelectItem>
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
                      const isConstruccion = !!parada.enConstruccion;
                      return (
                        <TableRow
                          key={parada.id}
                          className={isConstruccion ? "bg-amber-50" : ""}
                        >
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
                                user?.role === "admin" &&
                                handleToggleCondicion(
                                  parada.id,
                                  "condicionPintada",
                                  parada.condicionPintada
                                )
                              }
                              disabled={user?.role !== "admin"}
                              className={`flex items-center gap-1 transition-opacity ${user?.role === "admin" ? "hover:opacity-70 cursor-pointer" : "cursor-not-allowed opacity-60"}`}
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
                                user?.role === "admin" &&
                                handleToggleCondicion(
                                  parada.id,
                                  "condicionArreglada",
                                  parada.condicionArreglada
                                )
                              }
                              disabled={user?.role !== "admin"}
                              className={`flex items-center gap-1 transition-opacity ${user?.role === "admin" ? "hover:opacity-70 cursor-pointer" : "cursor-not-allowed opacity-60"}`}
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
                                user?.role === "admin" &&
                                handleToggleCondicion(
                                  parada.id,
                                  "condicionLimpia",
                                  parada.condicionLimpia
                                )
                              }
                              disabled={user?.role !== "admin"}
                              className={`flex items-center gap-1 transition-opacity ${user?.role === "admin" ? "hover:opacity-70 cursor-pointer" : "cursor-not-allowed opacity-60"}`}
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
                                user?.role === "admin" && handleDisplayChange(parada.id, value)
                              }
                              disabled={user?.role !== "admin"}
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
                            <div className="flex flex-col gap-1">
                              {isConstruccion ? (
                                <>
                                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 w-fit">
                                    <HardHat className="h-3 w-3" />
                                    En Construcción
                                  </Badge>
                                  {parada.fechaDisponibilidad && (
                                    <span className="text-xs text-amber-700">
                                      Disp.:{" "}
                                      {new Date(parada.fechaDisponibilidad).toLocaleDateString(
                                        "es-PR"
                                      )}
                                    </span>
                                  )}
                                  {user?.role === "admin" && (
                                    <button
                                      onClick={() => openConstruccionDialog(parada)}
                                      className="text-xs text-gray-500 underline hover:text-gray-700 text-left"
                                    >
                                      Quitar estado
                                    </button>
                                  )}
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Badge variant={isRenovada ? "default" : "secondary"}>
                                    {isRenovada ? "Renovada" : "Pendiente"}
                                  </Badge>
                                  {user?.role === "admin" && (
                                    <button
                                      onClick={() => openConstruccionDialog(parada)}
                                      title="Marcar como En Construcción"
                                      className="text-amber-600 hover:text-amber-800 transition-colors"
                                    >
                                      <HardHat className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
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

      {/* En Construccion Dialog */}
      <Dialog open={isConstruccionDialogOpen} onOpenChange={setIsConstruccionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-amber-600" />
              {construccionParada?.enConstruccion
                ? "Quitar Estado En Construcción"
                : "Marcar como En Construcción"}
            </DialogTitle>
            <DialogDescription>
              Cara: {construccionParada?.cobertizoId} — {construccionParada?.localizacion}
            </DialogDescription>
          </DialogHeader>

          {!construccionParada?.enConstruccion ? (
            <div className="py-2">
              {/* Alert: active anuncios exist */}
              {activeAnunciosForParada.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg">
                  <p className="text-sm font-semibold text-red-700 mb-2">
                    ⚠️ Esta cara tiene {activeAnunciosForParada.length} anuncio{activeAnunciosForParada.length > 1 ? "s" : ""} activo{activeAnunciosForParada.length > 1 ? "s" : ""}:
                  </p>
                  <ul className="space-y-1">
                    {activeAnunciosForParada.map((a: any) => (
                      <li key={a.id} className="text-xs text-red-700 flex items-center justify-between gap-2">
                        <span>
                          <strong>{a.cliente}</strong> — {a.producto || a.tipo}
                          {a.fechaFin && (
                            <span className="text-red-500">
                              {" "}(hasta {new Date(a.fechaFin).toLocaleDateString("es-PR")})
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => {
                            setIsConstruccionDialogOpen(false);
                            navigate(`/anuncios?anuncioId=${a.id}`);
                          }}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                          title="Abrir anuncio en Gestor de Anuncios para relocalizarlo"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Relocalizar
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    Debes relocalizar o cancelar {activeAnunciosForParada.length > 1 ? "estos anuncios" : "este anuncio"} antes de marcar la cara como En Construcción.
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">
                Esta cara quedará marcada como <strong>En Construcción</strong> y no estará
                disponible para asignación de anuncios hasta que se remueva el estado.
              </p>
              <div>
                <Label htmlFor="fecha-disponibilidad" className="text-sm font-medium">
                  Fecha estimada de disponibilidad <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fecha-disponibilidad"
                  type="date"
                  value={fechaDisponibilidad}
                  onChange={(e) => setFechaDisponibilidad(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-1"
                  disabled={activeAnunciosForParada.length > 0}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fecha en que se espera que la cara esté disponible nuevamente.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-sm text-gray-600">
                ¿Confirmas que deseas remover el estado <strong>En Construcción</strong> de esta
                cara? Volverá a estar disponible para asignación de anuncios.
              </p>
              {construccionParada?.fechaDisponibilidad && (
                <p className="text-sm text-amber-700 mt-2">
                  Fecha estimada registrada:{" "}
                  <strong>
                    {new Date(construccionParada.fechaDisponibilidad).toLocaleDateString("es-PR")}
                  </strong>
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConstruccionDialogOpen(false);
                setConstruccionParada(null);
                setFechaDisponibilidad("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSetConstruccion}
              className={
                construccionParada?.enConstruccion
                  ? "bg-gray-600 hover:bg-gray-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }
              disabled={updateCondicion.isPending || (!construccionParada?.enConstruccion && activeAnunciosForParada.length > 0)}
              title={!construccionParada?.enConstruccion && activeAnunciosForParada.length > 0 ? "Relocaliza o cancela los anuncios activos primero" : undefined}
            >
              {construccionParada?.enConstruccion ? "Quitar Estado" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
