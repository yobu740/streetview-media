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
import { Loader2, Plus, Search, Edit, Trash2, Calendar, Printer, Eye, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Admin() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParada, setSelectedParada] = useState<any>(null);
  const [isAnuncioDialogOpen, setIsAnuncioDialogOpen] = useState(false);
  const [isDetalleDialogOpen, setIsDetalleDialogOpen] = useState(false);
  const [isAddParadaDialogOpen, setIsAddParadaDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paradaToDelete, setParadaToDelete] = useState<any>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Filter state
  const [filterStatus, setFilterStatus] = useState<"all" | "disponible" | "ocupada">("all");
  const [filterTipo, setFilterTipo] = useState<"all" | "Fija" | "Bonificación">("all");
  const [filterRuta, setFilterRuta] = useState("");
  
  // Print filter state
  const [printFilterStatus, setPrintFilterStatus] = useState<"all" | "disponible" | "ocupada">("all");
  const [printFilterTipo, setPrintFilterTipo] = useState<"all" | "Fija" | "Bonificación">("all");
  const [printFilterRuta, setPrintFilterRuta] = useState("");
  
  const [anuncioForm, setAnuncioForm] = useState({
    cliente: "",
    tipo: "Fijo" as "Fijo" | "Bonificación",
    fechaInicio: "",
    fechaFin: "",
    estado: "Activo" as "Activo" | "Programado" | "Finalizado",
    notas: "",
  });
  
  const [paradaForm, setParadaForm] = useState({
    cobertizoId: "",
    localizacion: "",
    direccion: "",
    ruta: "",
    tipoFormato: "Fija" as "Fija" | "Digital",
    orientacion: "",
    fotoBase64: "",
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
  
  const createParada = trpc.paradas.create.useMutation({
    onSuccess: () => {
      toast.success("Parada creada exitosamente");
      setIsAddParadaDialogOpen(false);
      setParadaForm({
        cobertizoId: "",
        localizacion: "",
        direccion: "",
        ruta: "",
        tipoFormato: "Fija",
        orientacion: "",
        fotoBase64: "",
      });
      refetchParadas();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
  
  const deleteParada = trpc.paradas.delete.useMutation({
    onSuccess: () => {
      toast.success("Parada eliminada exitosamente");
      setIsDeleteDialogOpen(false);
      setParadaToDelete(null);
      refetchParadas();
      refetchAnuncios();
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

  // Apply all filters
  const filteredParadas = paradas?.filter(p => {
    // Search filter
    const matchesSearch = 
      p.cobertizoId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.localizacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.direccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.ruta && p.ruta.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const { status } = getParadaStatus(p.id);
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "disponible" && status === "Disponible") ||
      (filterStatus === "ocupada" && status === "Ocupada");
    
    // Tipo filter
    const matchesTipo = filterTipo === "all" || 
      (filterTipo === "Fija" && p.tipoFormato === "Fija") ||
      (filterTipo === "Bonificación" && p.tipoFormato === "Digital");
    
    // Ruta filter
    const matchesRuta = !filterRuta || (p.ruta && p.ruta.toLowerCase().includes(filterRuta.toLowerCase()));
    
    return matchesSearch && matchesStatus && matchesTipo && matchesRuta;
  }) || [];
  
  // Get paradas for printing with filters
  const getPrintParadas = () => {
    return paradas?.filter(p => {
      const { status } = getParadaStatus(p.id);
      const matchesStatus = printFilterStatus === "all" || 
        (printFilterStatus === "disponible" && status === "Disponible") ||
        (printFilterStatus === "ocupada" && status === "Ocupada");
      
      const matchesTipo = printFilterTipo === "all" || 
        (printFilterTipo === "Fija" && p.tipoFormato === "Fija") ||
        (printFilterTipo === "Bonificación" && p.tipoFormato === "Digital");
      
      const matchesRuta = !printFilterRuta || (p.ruta && p.ruta.toLowerCase().includes(printFilterRuta.toLowerCase()));
      
      return matchesStatus && matchesTipo && matchesRuta;
    }) || [];
  };
  
  // Pagination
  const totalPages = Math.ceil(filteredParadas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParadas = filteredParadas.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
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
  
  const uploadFoto = trpc.paradas.uploadFoto.useMutation({
    onSuccess: () => {
      toast.success("Foto actualizada exitosamente");
      refetchParadas();
    },
    onError: (error) => {
      toast.error(`Error al subir foto: ${error.message}`);
    },
  });
  
  const handleCreateParada = async () => {
    // Primero crear la parada
    const result = await createParada.mutateAsync({
      cobertizoId: paradaForm.cobertizoId,
      localizacion: paradaForm.localizacion,
      direccion: paradaForm.direccion,
      ruta: paradaForm.ruta || undefined,
      tipoFormato: paradaForm.tipoFormato,
      orientacion: paradaForm.orientacion || undefined,
    });
    
    // Si hay foto, subirla
    if (paradaForm.fotoBase64 && result.id) {
      await uploadFoto.mutateAsync({
        paradaId: result.id,
        cobertizoId: paradaForm.cobertizoId,
        fotoBase64: paradaForm.fotoBase64,
      });
    }
  };
  
  const handleDeleteParada = () => {
    if (!paradaToDelete) return;
    deleteParada.mutate({ id: paradaToDelete.id });
  };

  const handlePrintReport = () => {
    setIsPrintDialogOpen(false);
    setTimeout(() => {
      const printContent = document.getElementById('print-content');
      if (!printContent) return;
      
      const printWindow = window.open('', '', 'width=800,height=600');
      if (!printWindow) return;
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Reporte de Paradas - Streetview Media</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #1a4d3c; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #1a4d3c; color: white; }
              tr:nth-child(even) { background-color: #f2f2f2; }
              .stats { display: flex; gap: 20px; margin: 20px 0; }
              .stat-card { border: 2px solid #1a4d3c; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }, 100);
  };
  
  const disponiblesCount = filteredParadas.filter(p => getParadaStatus(p.id).status === "Disponible").length;
  const ocupadasCount = filteredParadas.filter(p => getParadaStatus(p.id).status === "Ocupada").length;

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
            <Button variant="outline" onClick={() => setIsPrintDialogOpen(true)}>
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Panel Administrativo</h1>
            <p className="text-body text-lg text-gray-600">Gestión de paradas y anuncios</p>
          </div>
          <Button 
            onClick={() => setIsAddParadaDialogOpen(true)}
            className="bg-[#1a4d3c] hover:bg-[#0f3a2a]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Parada
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 print:hidden">
          <CardContent className="pt-6">
            <div className="space-y-4">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Filtrar por Tipo</Label>
                  <Select value={filterTipo} onValueChange={(v: any) => { setFilterTipo(v); handleFilterChange(); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Fija">Fija (F)</SelectItem>
                      <SelectItem value="Bonificación">Bonificación (B)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Filtrar por Ruta</Label>
                  <Input
                    placeholder="Ej: Ruta 1, Ruta 2..."
                    value={filterRuta}
                    onChange={(e) => { setFilterRuta(e.target.value); handleFilterChange(); }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - Now clickable filters */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${filterStatus === "all" ? "ring-2 ring-[#1a4d3c]" : ""}`}
            onClick={() => { setFilterStatus("all"); handleFilterChange(); }}
          >
            <CardHeader>
              <CardTitle className="text-2xl">{paradas?.length || 0}</CardTitle>
              <CardDescription>Total Paradas</CardDescription>
            </CardHeader>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${filterStatus === "disponible" ? "ring-2 ring-green-600" : ""}`}
            onClick={() => { setFilterStatus("disponible"); handleFilterChange(); }}
          >
            <CardHeader>
              <CardTitle className="text-2xl text-green-600">
                {disponiblesCount}
              </CardTitle>
              <CardDescription>Paradas Disponibles</CardDescription>
            </CardHeader>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${filterStatus === "ocupada" ? "ring-2 ring-orange-600" : ""}`}
            onClick={() => { setFilterStatus("ocupada"); handleFilterChange(); }}
          >
            <CardHeader>
              <CardTitle className="text-2xl text-orange-600">
                {ocupadasCount}
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
              Mostrando {startIndex + 1}-{Math.min(endIndex, filteredParadas.length)} de {filteredParadas.length} paradas
              {searchTerm || filterStatus !== "all" || filterTipo !== "all" || filterRuta ? ` (filtradas de ${paradas?.length})` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paradasLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#1a4d3c]" />
              </div>
            ) : (
              <>
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
                      {paginatedParadas.map((parada) => {
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
                                      <div className="aspect-video w-full overflow-hidden rounded-lg relative group">
                                        <img 
                                          src={parada.fotoUrl || "https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/IqmhOIoWLSiCKbXF.jpg"}
                                          alt="Parada de guagua"
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                              const input = document.createElement('input');
                                              input.type = 'file';
                                              input.accept = 'image/*';
                                              input.onchange = (e: any) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  const reader = new FileReader();
                                                  reader.onloadend = async () => {
                                                    await uploadFoto.mutateAsync({
                                                      paradaId: parada.id,
                                                      cobertizoId: parada.cobertizoId,
                                                      fotoBase64: reader.result as string,
                                                    });
                                                  };
                                                  reader.readAsDataURL(file);
                                                }
                                              };
                                              input.click();
                                            }}
                                          >
                                            Cambiar Foto
                                          </Button>
                                        </div>
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
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Label className="text-gray-500">Fecha Inicio</Label>
                                                <p className="font-medium">{new Date(anuncio.fechaInicio).toLocaleDateString()}</p>
                                              </div>
                                              <div>
                                                <Label className="text-gray-500">Fecha Fin</Label>
                                                <p className="font-medium">{new Date(anuncio.fechaFin).toLocaleDateString()}</p>
                                              </div>
                                            </div>
                                            {anuncio.notas && (
                                              <div>
                                                <Label className="text-gray-500">Notas</Label>
                                                <p className="font-medium">{anuncio.notas}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedParada(parada);
                                    setIsAnuncioDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => {
                                    setParadaToDelete(parada);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Anuncio Dialog */}
      <Dialog open={isAnuncioDialogOpen} onOpenChange={setIsAnuncioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Anuncio</DialogTitle>
            <DialogDescription>
              Parada: {selectedParada?.cobertizoId} - {selectedParada?.localizacion}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Input
                value={anuncioForm.cliente}
                onChange={(e) => setAnuncioForm({ ...anuncioForm, cliente: e.target.value })}
                placeholder="Nombre del cliente"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={anuncioForm.tipo} onValueChange={(v: any) => setAnuncioForm({ ...anuncioForm, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fija">Fija</SelectItem>
                  <SelectItem value="Bonificación">Bonificación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={anuncioForm.fechaInicio}
                  onChange={(e) => setAnuncioForm({ ...anuncioForm, fechaInicio: e.target.value })}
                />
              </div>
              <div>
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={anuncioForm.fechaFin}
                  onChange={(e) => setAnuncioForm({ ...anuncioForm, fechaFin: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={anuncioForm.estado} onValueChange={(v: any) => setAnuncioForm({ ...anuncioForm, estado: v })}>
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
              <Label>Notas (opcional)</Label>
              <Textarea
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
              disabled={!anuncioForm.cliente || !anuncioForm.fechaInicio || !anuncioForm.fechaFin}
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a]"
            >
              Crear Anuncio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Parada Dialog */}
      <Dialog open={isAddParadaDialogOpen} onOpenChange={setIsAddParadaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nueva Parada</DialogTitle>
            <DialogDescription>
              Completa la información de la nueva parada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ID Cobertizo *</Label>
              <Input
                value={paradaForm.cobertizoId}
                onChange={(e) => setParadaForm({ ...paradaForm, cobertizoId: e.target.value })}
                placeholder="Ej: 257, 589A"
              />
            </div>
            <div>
              <Label>Localización *</Label>
              <Input
                value={paradaForm.localizacion}
                onChange={(e) => setParadaForm({ ...paradaForm, localizacion: e.target.value })}
                placeholder="Ej: San Juan, Bayamón"
              />
            </div>
            <div>
              <Label>Dirección *</Label>
              <Textarea
                value={paradaForm.direccion}
                onChange={(e) => setParadaForm({ ...paradaForm, direccion: e.target.value })}
                placeholder="Dirección completa de la parada"
              />
            </div>
            <div>
              <Label>Ruta</Label>
              <Input
                value={paradaForm.ruta}
                onChange={(e) => setParadaForm({ ...paradaForm, ruta: e.target.value })}
                placeholder="Ej: Ruta 1, Ruta 26"
              />
            </div>
            <div>
              <Label>Tipo de Formato *</Label>
              <Select value={paradaForm.tipoFormato} onValueChange={(v: any) => setParadaForm({ ...paradaForm, tipoFormato: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fija">Fija</SelectItem>
                  <SelectItem value="Digital">Bonificación (Digital)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Orientación</Label>
              <Input
                value={paradaForm.orientacion}
                onChange={(e) => setParadaForm({ ...paradaForm, orientacion: e.target.value })}
                placeholder="Ej: I (Inbound), O (Outbound), P (Peatonal)"
              />
            </div>
            <div>
              <Label>Foto de la Parada</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setParadaForm({ ...paradaForm, fotoBase64: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {paradaForm.fotoBase64 && (
                <img src={paradaForm.fotoBase64} alt="Preview" className="mt-2 w-full h-32 object-cover rounded" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddParadaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateParada}
              disabled={!paradaForm.cobertizoId || !paradaForm.localizacion || !paradaForm.direccion}
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a]"
            >
              Crear Parada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Parada Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              ¿Eliminar Parada?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar la parada <strong>{paradaToDelete?.cobertizoId}</strong> ({paradaToDelete?.localizacion}).
              Esta acción no se puede deshacer y también eliminará todos los anuncios asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteParada}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Print Report Dialog with Filters */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Reporte</DialogTitle>
            <DialogDescription>
              Selecciona los filtros para el reporte que deseas imprimir
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Filtrar por Estado</Label>
              <Select value={printFilterStatus} onValueChange={(v: any) => setPrintFilterStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="disponible">Solo Disponibles</SelectItem>
                  <SelectItem value="ocupada">Solo Ocupadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filtrar por Tipo</Label>
              <Select value={printFilterTipo} onValueChange={(v: any) => setPrintFilterTipo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Fija">Fija (F)</SelectItem>
                  <SelectItem value="Bonificación">Bonificación (B)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filtrar por Ruta</Label>
              <Input
                placeholder="Ej: Ruta 1, Ruta 2... (dejar vacío para todas)"
                value={printFilterRuta}
                onChange={(e) => setPrintFilterRuta(e.target.value)}
              />
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                El reporte incluirá <strong>{getPrintParadas().length}</strong> paradas según los filtros seleccionados.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePrintReport} className="bg-[#1a4d3c] hover:bg-[#0f3a2a]">
              <Printer className="h-4 w-4 mr-2" />
              Generar Reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Hidden Print Content */}
      <div id="print-content" className="hidden">
        <h1>Reporte de Paradas - Streetview Media</h1>
        <p>Fecha: {new Date().toLocaleDateString()}</p>
        <div className="stats">
          <div className="stat-card">
            <strong>Total:</strong> {getPrintParadas().length}
          </div>
          <div className="stat-card">
            <strong>Disponibles:</strong> {getPrintParadas().filter(p => getParadaStatus(p.id).status === "Disponible").length}
          </div>
          <div className="stat-card">
            <strong>Ocupadas:</strong> {getPrintParadas().filter(p => getParadaStatus(p.id).status === "Ocupada").length}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Localización</th>
              <th>Ruta</th>
              <th>Dirección</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Cliente</th>
            </tr>
          </thead>
          <tbody>
            {getPrintParadas().map((parada) => {
              const { status, anuncio } = getParadaStatus(parada.id);
              return (
                <tr key={parada.id}>
                  <td>{parada.cobertizoId}</td>
                  <td>{parada.localizacion || "—"}</td>
                  <td>{parada.ruta || "—"}</td>
                  <td>{parada.direccion}</td>
                  <td>{parada.tipoFormato === "Digital" ? "B" : "F"}</td>
                  <td>{status}</td>
                  <td>{anuncio?.cliente || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
