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
import { Loader2, Plus, Search, Edit, Trash2, Calendar, Printer, Eye, ChevronLeft, ChevronRight, AlertTriangle, FileSpreadsheet, BarChart3, Bell, X, Check, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Admin() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  // Notification queries
  const { data: notifications } = trpc.notifications.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, { enabled: isAuthenticated });
  const { data: pendingReservations } = trpc.approvals.pending.useQuery(undefined, { enabled: isAuthenticated && user?.role === 'admin' });
  const markAsRead = trpc.notifications.markAsRead.useMutation();
  const approveReservation = trpc.approvals.approve.useMutation();
  const rejectReservation = trpc.approvals.reject.useMutation();
  const [searchTerm, setSearchTerm] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedParada, setSelectedParada] = useState<any>(null);
  const [isAnuncioDialogOpen, setIsAnuncioDialogOpen] = useState(false);
  const [isDetalleDialogOpen, setIsDetalleDialogOpen] = useState(false);
  const [isAddParadaDialogOpen, setIsAddParadaDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paradaToDelete, setParadaToDelete] = useState<any>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [availabilityInfo, setAvailabilityInfo] = useState<any>(null);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Filter state
  const [filterStatus, setFilterStatus] = useState<"all" | "disponible" | "ocupada">("all");
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
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
  
  // Check availability when dates change
  const { data: checkAvailabilityData } = trpc.anuncios.checkDisponibilidad.useQuery(
    {
      paradaId: selectedParada?.id || 0,
      fechaInicio: anuncioForm.fechaInicio ? new Date(anuncioForm.fechaInicio) : new Date(),
      fechaFin: anuncioForm.fechaFin ? new Date(anuncioForm.fechaFin) : new Date(),
    },
    {
      enabled: !!selectedParada && !!anuncioForm.fechaInicio && !!anuncioForm.fechaFin,
    }
  );
  
  // Update availability info when data changes
  useEffect(() => {
    if (checkAvailabilityData) {
      setAvailabilityInfo(checkAvailabilityData);
    }
  }, [checkAvailabilityData]);

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
  
  const uploadFoto = trpc.paradas.uploadFoto.useMutation({
    onSuccess: () => {
      toast.success("Foto actualizada exitosamente");
      refetchParadas();
    },
    onError: (error) => {
      toast.error(`Error al subir foto: ${error.message}`);
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
      <div className="min-h-screen flex">
        {/* Left side - Branding with bus stop image */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-[#1a4d3c] items-center justify-center overflow-hidden">
          {/* Background image */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{
              backgroundImage: "url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/akCQAUPPSFjmkLQn.png')"
            }}
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a4d3c] to-[#0f3a2a] opacity-80" />
          
          {/* Content */}
          <div className="relative z-10 text-center px-8">
            <img 
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png" 
              alt="Streetview Media" 
              className="h-16 mx-auto mb-6 brightness-0 invert"
            />
            <h1 className="text-display text-4xl text-white mb-4 font-bold">
              Panel Administrativo
            </h1>
            <p className="text-body text-xl text-white/90 max-w-md mx-auto">
              Gestiona tu inventario de paradas de guagua y campañas publicitarias
            </p>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            {/* Mobile logo */}
            <div className="lg:hidden text-center">
              <img 
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png" 
                alt="Streetview Media" 
                className="h-12 mx-auto mb-4"
              />
            </div>
            
            <div>
              <h2 className="text-display text-3xl font-bold text-[#1a4d3c] text-center">
                Iniciar Sesión
              </h2>
              <p className="mt-2 text-center text-body text-[#2a2a2a]">
                Accede al panel administrativo con tu cuenta de Microsoft
              </p>
            </div>

            <div className="mt-8 space-y-6">
              {/* Microsoft Sign In Button */}
              <Button 
                asChild 
                className="w-full h-12 bg-white hover:bg-gray-50 text-[#2a2a2a] border-2 border-gray-300 hover:border-[#ff6b35] transition-all shadow-md hover:shadow-lg"
              >
                <a href={getLoginUrl()} className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 0H0V11H11V0Z" fill="#F25022"/>
                    <path d="M23 0H12V11H23V0Z" fill="#7FBA00"/>
                    <path d="M11 12H0V23H11V12Z" fill="#00A4EF"/>
                    <path d="M23 12H12V23H23V12Z" fill="#FFB900"/>
                  </svg>
                  <span className="text-body font-semibold">Iniciar sesión con Microsoft</span>
                </a>
              </Button>

              {/* Info text */}
              <div className="text-center">
                <p className="text-sm text-[#2a2a2a]/60">
                  Utiliza tu cuenta de Microsoft 365 para acceder
                </p>
              </div>

              {/* Decorative element */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-2 text-sm text-[#2a2a2a]/60">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>Conexión segura</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchTerm("");
    setClientSearch("");
    setFilterStatus("all");
    setFilterApprovalStatus("all");
    setFilterTipo("all");
    setFilterRuta("");
    setCurrentPage(1);
    toast.success("Filtros limpiados");
  };
  
  // Check if any filter is active
  const hasActiveFilters = searchTerm || clientSearch || filterStatus !== "all" || filterApprovalStatus !== "all" || filterTipo !== "all" || filterRuta;
  
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
    // Search filter (general search)
    const matchesSearch = !searchTerm || 
      p.cobertizoId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.localizacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.direccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.ruta && p.ruta.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Client search filter (search by anuncio cliente)
    const matchesClientSearch = !clientSearch || 
      anuncios?.some(a => 
        a.paradaId === p.id && 
        a.cliente.toLowerCase().includes(clientSearch.toLowerCase())
      );
    
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
    
    // Approval status filter (check if any anuncio for this parada matches the approval status)
    const matchesApprovalStatus = filterApprovalStatus === "all" || 
      anuncios?.some(a => 
        a.paradaId === p.id && a.approvalStatus === filterApprovalStatus
      );
    
    return matchesSearch && matchesClientSearch && matchesStatus && matchesTipo && matchesRuta && matchesApprovalStatus;
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

  const handleExportToExcel = () => {
    import('xlsx').then((XLSX) => {
      // Prepare data for export
      const exportData = filteredParadas.map(parada => {
        const { status, anuncio } = getParadaStatus(parada.id);
        return {
          'ID': parada.cobertizoId,
          'Localización': parada.localizacion || '',
          'Ruta': parada.ruta || '',
          'Dirección': parada.direccion || '',
          'Orientación': parada.orientacion || '',
          'Tipo': parada.tipoFormato === 'Digital' ? 'Digital (B)' : 'Fija (F)',
          'Estado': status,
          'Cliente Actual': anuncio ? anuncio.cliente : '',
          'Fecha Inicio': anuncio ? new Date(anuncio.fechaInicio).toLocaleDateString() : '',
          'Fecha Fin': anuncio ? new Date(anuncio.fechaFin).toLocaleDateString() : '',
          'Tipo Anuncio': anuncio ? anuncio.tipo : '',
          'Coordenadas': parada.coordenadasLat && parada.coordenadasLng ? `${parada.coordenadasLat}, ${parada.coordenadasLng}` : '',
        };
      });
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const colWidths = [
        { wch: 10 },  // ID
        { wch: 25 },  // Localización
        { wch: 15 },  // Ruta
        { wch: 40 },  // Dirección
        { wch: 12 },  // Orientación
        { wch: 15 },  // Tipo
        { wch: 12 },  // Estado
        { wch: 25 },  // Cliente
        { wch: 12 },  // Fecha Inicio
        { wch: 12 },  // Fecha Fin
        { wch: 15 },  // Tipo Anuncio
        { wch: 25 },  // Coordenadas
      ];
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Paradas');
      
      // Generate filename with date
      const today = new Date().toISOString().split('T')[0];
      const filename = `Paradas_Streetview_${today}.xlsx`;
      
      // Download file
      XLSX.writeFile(wb, filename);
      
      toast.success('Archivo Excel descargado exitosamente');
    }).catch(error => {
      console.error('Error exporting to Excel:', error);
      toast.error('Error al exportar a Excel');
    });
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
          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-4">
            <span className="text-sm text-gray-600">Hola, {user?.name || user?.email}</span>
            
            {/* Notification Bell */}
            {user?.role === 'admin' && (
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#ff6b35] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </div>
            )}
            
            <Button variant="outline" asChild>
              <Link href="/calendar">
                <Calendar className="h-4 w-4 mr-2" />
                Calendario
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/metrics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Métricas
              </Link>
            </Button>
            <Button variant="outline" onClick={handleExportToExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar a Excel
            </Button>
            <Button variant="outline" onClick={() => setIsPrintDialogOpen(true)}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Reporte
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Ver Sitio Público</Link>
            </Button>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            {/* Notification Bell - Mobile */}
            {user?.role === 'admin' && (
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#ff6b35] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    {unreadCount}
                  </span>
                )}
              </Button>
            )}
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b-2 border-[#1a4d3c] shadow-lg">
          <div className="container py-4 space-y-2">
            <div className="text-sm text-gray-600 mb-4">Hola, {user?.name || user?.email}</div>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/calendar" onClick={() => setIsMobileMenuOpen(false)}>
                <Calendar className="h-4 w-4 mr-2" />
                Calendario
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/metrics" onClick={() => setIsMobileMenuOpen(false)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Métricas
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => {
                handleExportToExcel();
                setIsMobileMenuOpen(false);
              }}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar a Excel
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => {
                setIsPrintDialogOpen(true);
                setIsMobileMenuOpen(false);
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Reporte
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>Ver Sitio Público</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Notification Panel */}
      {isNotificationPanelOpen && user?.role === 'admin' && (
        <div className="fixed top-20 right-4 w-96 bg-white border-2 border-[#1a4d3c] shadow-2xl z-50 max-h-[600px] overflow-y-auto">
          <div className="p-4 border-b-2 border-[#1a4d3c] flex justify-between items-center">
            <h3 className="text-display text-xl text-[#1a4d3c]">Notificaciones</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsNotificationPanelOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="divide-y">
            {notifications && notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    notif.read === 0 ? 'bg-[#fff5f0]' : ''
                  }`}
                  onClick={() => {
                    if (notif.read === 0) {
                      markAsRead.mutate({ id: notif.id });
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-[#1a4d3c]">{notif.title}</h4>
                    {notif.read === 0 && (
                      <span className="w-2 h-2 bg-[#ff6b35] rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notif.createdAt).toLocaleString('es-PR')}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No hay notificaciones
              </div>
            )}
          </div>
        </div>
      )}

      <div className="container py-12">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Panel Administrativo</h1>
            <p className="text-body text-lg text-gray-600">Gestión de paradas y anuncios</p>
          </div>
          {user?.role === 'admin' && (
            <Button 
              onClick={() => setIsAddParadaDialogOpen(true)}
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Parada
            </Button>
          )}
        </div>

        {/* Pending Reservations Section - Admin Only */}
        {user?.role === 'admin' && pendingReservations && pendingReservations.length > 0 && (
          <Card className="mb-8 border-2 border-[#ff6b35] print:hidden">
            <CardHeader>
              <CardTitle className="text-[#ff6b35] flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Reservas Pendientes de Aprobación ({pendingReservations.length})
              </CardTitle>
              <CardDescription>
                Estas reservas requieren tu aprobación antes de ser confirmadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingReservations.map((anuncio) => {
                  const parada = paradas?.find(p => p.id === anuncio.paradaId);
                  return (
                    <div key={anuncio.id} className="border-2 border-gray-200 p-4 rounded-lg hover:border-[#ff6b35] transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-[#1a4d3c] mb-2">{anuncio.cliente}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div><span className="font-medium">Parada:</span> {parada?.cobertizoId} - {parada?.localizacion}</div>
                            <div><span className="font-medium">Tipo:</span> {anuncio.tipo}</div>
                            <div><span className="font-medium">Inicio:</span> {new Date(anuncio.fechaInicio).toLocaleDateString('es-PR')}</div>
                            <div><span className="font-medium">Fin:</span> {new Date(anuncio.fechaFin).toLocaleDateString('es-PR')}</div>
                          </div>
                          {anuncio.notas && (
                            <div className="mt-2 text-sm text-gray-500">
                              <span className="font-medium">Notas:</span> {anuncio.notas}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              approveReservation.mutate(
                                { anuncioId: anuncio.id },
                                {
                                  onSuccess: () => {
                                    toast.success("Reserva aprobada");
                                    refetchAnuncios();
                                  },
                                  onError: (error) => {
                                    toast.error(`Error: ${error.message}`);
                                  },
                                }
                              );
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Aprobar
                          </Button>
                          <Button
                            onClick={() => {
                              rejectReservation.mutate(
                                { anuncioId: anuncio.id },
                                {
                                  onSuccess: () => {
                                    toast.success("Reserva rechazada");
                                    refetchAnuncios();
                                  },
                                  onError: (error) => {
                                    toast.error(`Error: ${error.message}`);
                                  },
                                }
                              );
                            }}
                            variant="outline"
                            className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-8 print:hidden">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    placeholder="Buscar por ID, localización, dirección o ruta..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setClientSearch(""); }}
                    className="pl-10"
                  />
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ff6b35]" size={20} />
                  <Input
                    placeholder="Buscar por nombre de cliente..."
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setSearchTerm(""); }}
                    className="pl-10 border-[#ff6b35] focus:ring-[#ff6b35]"
                  />
                </div>
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    onClick={clearAllFilters}
                    className="border-[#ff6b35] text-[#ff6b35] hover:bg-[#ff6b35] hover:text-white"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Nueva Búsqueda
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                {user?.role === 'admin' && (
                  <div>
                    <Label>Estado de Aprobación</Label>
                    <Select value={filterApprovalStatus} onValueChange={(v: any) => { setFilterApprovalStatus(v); handleFilterChange(); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="approved">Aprobado</SelectItem>
                        <SelectItem value="rejected">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span>{parada.cobertizoId}</span>
                                {(parada as any).matchType === 'cliente' && (
                                  <Badge variant="default" className="bg-[#ff6b35] hover:bg-[#e65a25] text-xs">
                                    Cliente: {(parada as any).clienteNombre}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
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
                                
                                {user?.role === 'admin' && (
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
                                )}
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
          
          {availabilityInfo && !availabilityInfo.disponible && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Parada ocupada
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Esta parada tiene un anuncio activo hasta el{' '}
                    {availabilityInfo.proximaFechaDisponible && 
                      new Date(availabilityInfo.proximaFechaDisponible).toLocaleDateString()}
                    . Puedes reservarla a partir de esa fecha.
                  </p>
                </div>
              </div>
            </div>
          )}
          
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
