import { useState } from "react";
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
import { Search, Edit, X, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Anuncios() {
  const { data: anuncios, isLoading } = trpc.anuncios.list.useQuery();
  const { data: paradas } = trpc.paradas.list.useQuery();
  const updateAnuncio = trpc.anuncios.update.useMutation();
  const utils = trpc.useUtils();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAnuncio, setSelectedAnuncio] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    producto: "",
    cliente: "",
    fechaInicio: "",
    fechaFin: "",
    estado: "Activo" as "Disponible" | "Activo" | "Programado" | "Finalizado" | "Inactivo",
    tipo: "Fijo" as "Fijo" | "Bonificación",
    notas: "",
  });

  const filteredAnuncios = anuncios?.filter((a) => {
    const matchesSearch =
      !searchTerm ||
      a.producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.paradaId.toString().includes(searchTerm);

    const matchesEstado = filterEstado === "all" || a.estado === filterEstado;

    return matchesSearch && matchesEstado;
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
      producto: anuncio.producto || "",
      cliente: anuncio.cliente || "",
      fechaInicio: new Date(anuncio.fechaInicio).toISOString().split("T")[0],
      fechaFin: new Date(anuncio.fechaFin).toISOString().split("T")[0],
      estado: anuncio.estado,
      tipo: anuncio.tipo,
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

    updateAnuncio.mutate(
      {
        id: selectedAnuncio.id,
        producto: editForm.producto,
        cliente: editForm.cliente,
        fechaInicio: new Date(editForm.fechaInicio),
        fechaFin: new Date(editForm.fechaFin),
        estado: editForm.estado,
        tipo: editForm.tipo,
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
  };

  const hasActiveFilters = searchTerm || filterEstado !== "all";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <p className="text-gray-500">Cargando anuncios...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <nav className="bg-white border-b-4 border-[#1a4d3c] sticky top-0 z-50">
        <div className="container flex items-center justify-between h-20">
          <Link href="/">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png"
              alt="Streetview Media"
              className="h-12 cursor-pointer"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Volver al Panel
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="flex items-end">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  <X size={16} className="mr-2" />
                  Limpiar Filtros
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Total Anuncios</p>
            <p className="text-3xl font-bold text-[#1a4d3c]">
              {filteredAnuncios?.length || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Activos</p>
            <p className="text-3xl font-bold text-green-600">
              {filteredAnuncios?.filter((a) => a.estado === "Activo").length || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Programados</p>
            <p className="text-3xl font-bold text-blue-600">
              {filteredAnuncios?.filter((a) => a.estado === "Programado").length || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(anuncio)}
                        >
                          <Edit size={16} />
                        </Button>
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
  );
}
