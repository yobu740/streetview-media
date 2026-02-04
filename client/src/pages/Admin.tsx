import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Search, Edit, Trash2, Calendar, Printer, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Admin() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParada, setSelectedParada] = useState<any>(null);
  const [isAnuncioDialogOpen, setIsAnuncioDialogOpen] = useState(false);
  const [isDetalleDialogOpen, setIsDetalleDialogOpen] = useState(false);
  const [anuncioForm, setAnuncioForm] = useState({
    cliente: "",
    tipo: "Fijo" as "Fijo" | "Bonificación",
    fechaInicio: "",
    fechaFin: "",
    estado: "Activo" as "Activo" | "Programado" | "Finalizado",
    notas: "",
  });

  // Queries
  const { data: paradas, isLoading: paradasLoading, refetch: refetchParadas } = trpc.paradas.list.useQuery();
  const { data: anuncios, refetch: refetchAnuncios } = trpc.anuncios.list.useQuery();

  // Mutations
  const createAnuncio = trpc.anuncios.create.useMutation({
    onSuccess: () => {
      toast.success("Anuncio creado exitosamente");
      setIsAnuncioDialogOpen(false);
      setAnuncioForm({
        cliente: "",
        tipo: "Fijo",
        fechaInicio: "",
        fechaFin: "",
        estado: "Activo",
        notas: "",
      });
      refetchAnuncios();
      refetchParadas();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteAnuncio = trpc.anuncios.delete.useMutation({
    onSuccess: () => {
      toast.success("Anuncio eliminado");
      refetchAnuncios();
      refetchParadas();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4d3c]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f5]">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>Debes iniciar sesión para acceder al panel administrativo</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-[#1a4d3c] hover:bg-[#0f3a2a]">
              <a href={getLoginUrl()}>Iniciar Sesión</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredParadas = paradas?.filter(p =>
    p.cobertizoId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.localizacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.direccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.ruta && p.ruta.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const getParadaAnuncios = (paradaId: number) => {
    return anuncios?.filter(a => a.paradaId === paradaId) || [];
  };

  const getParadaStatus = (paradaId: number) => {
    const paradaAnuncios = getParadaAnuncios(paradaId);
    const now = new Date();
    
    const activeAnuncio = paradaAnuncios.find(a => 
      a.estado === "Activo" && 
      new Date(a.fechaInicio) <= now && 
      new Date(a.fechaFin) >= now
    );
    
    return activeAnuncio ? { status: "Ocupada", anuncio: activeAnuncio } : { status: "Disponible", anuncio: null };
  };

  const handleCreateAnuncio = () => {
    if (!selectedParada) return;
    
    createAnuncio.mutate({
      paradaId: selectedParada.id,
      cliente: anuncioForm.cliente,
      tipo: anuncioForm.tipo,
      fechaInicio: new Date(anuncioForm.fechaInicio),
      fechaFin: new Date(anuncioForm.fechaFin),
      estado: anuncioForm.estado,
      notas: anuncioForm.notas || undefined,
    });
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <nav className="bg-white border-b-4 border-[#1a4d3c] sticky top-0 z-50 print:hidden">
        <div className="container flex items-center justify-between h-20">
          <Link href="/">
            <img 
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png" 
              alt="Streetview Media" 
              className="h-12 cursor-pointer"
            />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Hola, {user?.name || user?.email}</span>
            <Button variant="outline" onClick={handlePrintReport}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Reporte
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Ver Sitio Público</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        <div className="mb-8">
          <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Panel Administrativo</h1>
          <p className="text-body text-lg text-gray-600">Gestión de paradas y anuncios</p>
        </div>

        {/* Search Bar */}
        <Card className="mb-8 print:hidden">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Buscar por ID, localización, dirección o ruta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{paradas?.length || 0}</CardTitle>
              <CardDescription>Total Paradas</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-green-600">
                {filteredParadas.filter(p => getParadaStatus(p.id).status === "Disponible").length}
              </CardTitle>
              <CardDescription>Paradas Disponibles</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-orange-600">
                {filteredParadas.filter(p => getParadaStatus(p.id).status === "Ocupada").length}
              </CardTitle>
              <CardDescription>Paradas Ocupadas</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Paradas Table */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Paradas</CardTitle>
            <CardDescription>
              {filteredParadas.length} paradas {searchTerm && `(filtradas de ${paradas?.length})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paradasLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#1a4d3c]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Cobertizo</TableHead>
                      <TableHead>Localización</TableHead>
                      <TableHead>Ruta</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Anuncio Actual</TableHead>
                      <TableHead className="print:hidden">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParadas.map((parada) => {
                      const { status, anuncio } = getParadaStatus(parada.id);
                      return (
                        <TableRow key={parada.id}>
                          <TableCell className="font-medium">{parada.cobertizoId}</TableCell>
                          <TableCell>{parada.localizacion || "—"}</TableCell>
                          <TableCell>{parada.ruta || "—"}</TableCell>
                          <TableCell className="max-w-xs truncate">{parada.direccion}</TableCell>
                          <TableCell>
                            <Badge variant={parada.tipoFormato === "Digital" ? "default" : "secondary"}>
                              {parada.tipoFormato === "Digital" ? "B" : "F"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status === "Disponible" ? "outline" : "destructive"}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {anuncio ? (
                              <div className="text-sm">
                                <div className="font-medium">{anuncio.cliente}</div>
                                <div className="text-gray-500 text-xs">
                                  {new Date(anuncio.fechaInicio).toLocaleDateString()} - {new Date(anuncio.fechaFin).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="print:hidden">
                            <div className="flex gap-2">
                              <Dialog open={isDetalleDialogOpen && selectedParada?.id === parada.id} onOpenChange={(open) => {
                                setIsDetalleDialogOpen(open);
                                if (open) setSelectedParada(parada);
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Detalle de Parada</DialogTitle>
                                    <DialogDescription>
                                      ID: {parada.cobertizoId}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="aspect-video w-full overflow-hidden rounded-lg">
                                      <img 
                                        src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/IqmhOIoWLSiCKbXF.jpg"
                                        alt="Parada de guagua"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-gray-500">ID Cobertizo</Label>
                                        <p className="font-medium">{parada.cobertizoId}</p>
                                      </div>
                                      <div>
                                        <Label className="text-gray-500">Tipo</Label>
                                        <p className="font-medium">{parada.tipoFormato === "Digital" ? "Bonificación" : "Fija"}</p>
                                      </div>
                                      <div>
                                        <Label className="text-gray-500">Localización</Label>
                                        <p className="font-medium">{parada.localizacion || "—"}</p>
                                      </div>
                                      <div>
                                        <Label className="text-gray-500">Ruta</Label>
                                        <p className="font-medium">{parada.ruta || "—"}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <Label className="text-gray-500">Dirección</Label>
                                        <p className="font-medium">{parada.direccion}</p>
                                      </div>
                                      <div>
                                        <Label className="text-gray-500">Orientación</Label>
                                        <p className="font-medium">{parada.orientacion || "—"}</p>
                                      </div>
                                      <div>
                                        <Label className="text-gray-500">Estado</Label>
                                        <Badge variant={status === "Disponible" ? "outline" : "destructive"}>
                                          {status}
                                        </Badge>
                                      </div>
                                    </div>
                                    {anuncio && (
                                      <div className="border-t pt-4">
                                        <h4 className="font-semibold mb-2">Anuncio Actual</h4>
                                        <div className="space-y-2">
                                          <div>
                                            <Label className="text-gray-500">Cliente</Label>
                                            <p className="font-medium">{anuncio.cliente}</p>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <Label className="text-gray-500">Tipo</Label>
                                              <p className="font-medium">{anuncio.tipo}</p>
                                            </div>
                                            <div>
                                              <Label className="text-gray-500">Estado</Label>
                                              <Badge>{anuncio.estado}</Badge>
                                            </div>
                                          </div>
                                          <div>
                                            <Label className="text-gray-500">Período</Label>
                                            <p className="font-medium">
                                              {new Date(anuncio.fechaInicio).toLocaleDateString()} - {new Date(anuncio.fechaFin).toLocaleDateString()}
                                            </p>
                                          </div>
                                          {anuncio.notas && (
                                            <div>
                                              <Label className="text-gray-500">Notas</Label>
                                              <p className="text-sm">{anuncio.notas}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Dialog open={isAnuncioDialogOpen && selectedParada?.id === parada.id} onOpenChange={(open) => {
                                setIsAnuncioDialogOpen(open);
                                if (open) setSelectedParada(parada);
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Agregar Anuncio
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Nuevo Anuncio</DialogTitle>
                                    <DialogDescription>
                                      Parada: {parada.cobertizoId} - {parada.direccion}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="cliente">Cliente / Producto</Label>
                                      <Input
                                        id="cliente"
                                        value={anuncioForm.cliente}
                                        onChange={(e) => setAnuncioForm({ ...anuncioForm, cliente: e.target.value })}
                                        placeholder="Nombre del cliente o producto"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="tipo">Tipo</Label>
                                      <Select value={anuncioForm.tipo} onValueChange={(value: any) => setAnuncioForm({ ...anuncioForm, tipo: value })}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Fijo">Fijo</SelectItem>
                                          <SelectItem value="Bonificación">Bonificación</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                                        <Input
                                          id="fechaInicio"
                                          type="date"
                                          value={anuncioForm.fechaInicio}
                                          onChange={(e) => setAnuncioForm({ ...anuncioForm, fechaInicio: e.target.value })}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="fechaFin">Fecha Fin</Label>
                                        <Input
                                          id="fechaFin"
                                          type="date"
                                          value={anuncioForm.fechaFin}
                                          onChange={(e) => setAnuncioForm({ ...anuncioForm, fechaFin: e.target.value })}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label htmlFor="estado">Estado</Label>
                                      <Select value={anuncioForm.estado} onValueChange={(value: any) => setAnuncioForm({ ...anuncioForm, estado: value })}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Activo">Activo</SelectItem>
                                          <SelectItem value="Programado">Programado</SelectItem>
                                          <SelectItem value="Finalizado">Finalizado</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label htmlFor="notas">Notas (opcional)</Label>
                                      <Textarea
                                        id="notas"
                                        value={anuncioForm.notas}
                                        onChange={(e) => setAnuncioForm({ ...anuncioForm, notas: e.target.value })}
                                        placeholder="Notas adicionales..."
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAnuncioDialogOpen(false)}>
                                      Cancelar
                                    </Button>
                                    <Button 
                                      onClick={handleCreateAnuncio}
                                      disabled={!anuncioForm.cliente || !anuncioForm.fechaInicio || !anuncioForm.fechaFin || createAnuncio.isPending}
                                      className="bg-[#1a4d3c] hover:bg-[#0f3a2a]"
                                    >
                                      {createAnuncio.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Anuncio"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
