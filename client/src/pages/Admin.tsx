import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { formatDateDisplay } from "@/lib/dateUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Search, Edit, Trash2, Calendar, Printer, Eye, ChevronLeft, ChevronRight, ChevronDown, AlertTriangle, FileSpreadsheet, BarChart3, Bell, X, Check, Menu, Megaphone } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Admin() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  // Notification queries
  const { data: notifications } = trpc.notifications.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, { enabled: isAuthenticated });
  const { data: pendingReservations } = trpc.approvals.pending.useQuery(undefined, { enabled: isAuthenticated && user?.role === 'admin' });
  const { data: expiringAnuncios } = trpc.notifications.expiringAnuncios.useQuery(undefined, { enabled: isAuthenticated && user?.role === 'admin' });
  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  const markAllAsRead = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  const approveReservation = trpc.approvals.approve.useMutation();
  const rejectReservation = trpc.approvals.reject.useMutation();
  const bulkApprove = trpc.approvals.bulkApprove.useMutation();
  const bulkReject = trpc.approvals.bulkReject.useMutation();
  const logActivity = trpc.activity.log.useMutation();
  const checkNotifications = trpc.invoices.checkAndNotify.useMutation();
  const ignoreNotification = trpc.notifications.ignore.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  const createSeguimientoFromExpiring = trpc.seguimientos.create.useMutation({
    onSuccess: (_, vars) => {
      setSeguimientoCreatedIds(prev => new Set(prev).add(vars.anuncioId));
      toast.success('Seguimiento creado. Puedes verlo en el área de Seguimientos.');
    },
    onError: () => toast.error('Error al crear seguimiento'),
  });
  const createSeguimientoFromNotif = trpc.notifications.createSeguimiento.useMutation({
    onSuccess: (data) => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      if (data.alreadyExists) {
        toast('Ya existe un seguimiento para este anuncio.');
      } else {
        toast.success('Seguimiento creado. Puedes verlo en el área de Seguimientos.');
      }
    },
    onError: () => toast.error('Error al crear seguimiento'),
  });
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [productoSearch, setProductoSearch] = useState("");
  const [selectedParada, setSelectedParada] = useState<any>(null);
  const [isAnuncioDialogOpen, setIsAnuncioDialogOpen] = useState(false);
  const [isDetalleDialogOpen, setIsDetalleDialogOpen] = useState(false);
  const [isAddParadaDialogOpen, setIsAddParadaDialogOpen] = useState(false);
  const [isCompanionDialogOpen, setIsCompanionDialogOpen] = useState(false);
  const [companionOrientation, setCompanionOrientation] = useState<"I" | "O" | null>(null);
  const [pendingCompanionForm, setPendingCompanionForm] = useState<typeof paradaForm | null>(null);
  const [duplicateCompanion, setDuplicateCompanion] = useState<any | null>(null); // existing parada that would be duplicated
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paradaToDelete, setParadaToDelete] = useState<any>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [availabilityInfo, setAvailabilityInfo] = useState<any>(null);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isExpiringOpen, setIsExpiringOpen] = useState(false); // accordion collapsed by default
  // Persist dismissed IDs in localStorage so they survive page refresh
  const [dismissedExpiringIds, setDismissedExpiringIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem('dismissedExpiringIds');
      return stored ? new Set<number>(JSON.parse(stored)) : new Set<number>();
    } catch { return new Set<number>(); }
  });
  const dismissExpiring = (id: number) => {
    setDismissedExpiringIds(prev => {
      const next = new Set(prev).add(id);
      try { localStorage.setItem('dismissedExpiringIds', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };
  const [seguimientoCreatedIds, setSeguimientoCreatedIds] = useState<Set<number>>(new Set()); // locally tracked (backend hasSeguimiento is the source of truth)
  
  // Bulk edit state
  const [bulkEditForm, setBulkEditForm] = useState({
    searchCliente: "",
    operation: "extend" as "extend" | "set",
    months: 3,
    newFechaInicio: "",
    newFechaFin: "",
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedReservations, setSelectedReservations] = useState<number[]>([]);
  const [selectedParadas, setSelectedParadas] = useState<number[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Filter state
  const [filterStatus, setFilterStatus] = useState<"all" | "disponible" | "ocupada" | "no_disponible">("all");

  const [filterApprovalStatus, setFilterApprovalStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [filterTipo, setFilterTipo] = useState<"all" | "Fija" | "Bonificación">("all");
  const [filterRuta, setFilterRuta] = useState("");
  const [filterFlowcat, setFilterFlowcat] = useState<string | null>(null);
  
  // Print filter state
  const [printFilterStatus, setPrintFilterStatus] = useState<"all" | "disponible" | "ocupada" | "no_disponible">("all");
  const [printFilterTipo, setPrintFilterTipo] = useState<"all" | "Fija" | "Bonificación">("all");
  const [printFilterRuta, setPrintFilterRuta] = useState("");
  const [printFilterFlowcat, setPrintFilterFlowcat] = useState<string | null>(null);
  const [printDateFrom, setPrintDateFrom] = useState("");
  const [printDateTo, setPrintDateTo] = useState("");
  
  const [anuncioForm, setAnuncioForm] = useState({
    producto: "",
    cliente: "",
    tipo: "Fijo" as "Fijo" | "Bonificación",
    fechaInicio: "",
    fechaFin: "",
    estado: "Activo" as "Disponible" | "Activo" | "Programado" | "Finalizado" | "Inactivo",
    notas: "",
  });
  
  const [paradaForm, setParadaForm] = useState({
    cobertizoId: "",
    localizacion: "",
    direccion: "",
    ruta: "",
    tipoFormato: "Fija" as "Fija" | "Digital",
    orientacion: "",
    flowCat: "",
    fotoBase64: "",
  });

  // Queries
  const { data: paradas, isLoading: paradasLoading, refetch: refetchParadas } = trpc.paradas.list.useQuery();
  const { data: anuncios, refetch: refetchAnuncios } = trpc.anuncios.list.useQuery();
  const { data: flowcats } = trpc.paradas.getFlowcats.useQuery();

  // Paradas físicas: consolidate IDs by stripping trailing A-H suffixes (e.g. AMA02A-AMA02H = 1 physical stop)
  // MUST be here (before any early returns) to comply with Rules of Hooks
  const paradasFisicasCount = useMemo(() => {
    if (!paradas || paradas.length === 0) return 0;
    const physicalIds = new Set<string>();
    for (const p of paradas) {
      const id = (p.cobertizoId || p.id?.toString() || "").trim().toUpperCase();
      // Strip trailing single letter A-H if it follows a digit (e.g. AMA02A → AMA02, 341A → 341)
      const base = id.replace(/([0-9])[A-H]$/, "$1");
      physicalIds.add(base);
    }
    return physicalIds.size;
  }, [paradas]);
  
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
        producto: "",
        cliente: "",
        tipo: "Fijo",
        fechaInicio: "",
        fechaFin: "",
        estado: "Activo",
        notas: "",
      });
      // Invalidate all related queries for real-time updates
      utils.anuncios.list.invalidate();
      utils.paradas.list.invalidate();
      utils.approvals.pending.invalidate();
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
      setParadaForm({
        cobertizoId: "",
        localizacion: "",
        direccion: "",
        ruta: "",
        tipoFormato: "Fija",
        orientacion: "",
        flowCat: "",
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
  
  const updateParadaLocation = trpc.paradas.updateLocation.useMutation({
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });
  
  const bulkUpdateDates = trpc.anuncios.bulkUpdateDates.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} anuncios actualizados exitosamente`);
      setIsBulkEditDialogOpen(false);
      setBulkEditForm({
        searchCliente: "",
        operation: "extend",
        months: 3,
        newFechaInicio: "",
        newFechaFin: "",
      });
      refetchAnuncios();
      refetchParadas();
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
  
  
  const updateAnuncioStatus = trpc.anuncios.updateStatus.useMutation();
  
  const cancelAnuncio = trpc.anuncios.cancel.useMutation({
    onSuccess: () => {
      toast.success("Anuncio cancelado exitosamente");
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
    setProductoSearch("");
    setFilterStatus("all");
    setFilterApprovalStatus("all");
    setFilterTipo("all");
    setFilterRuta("");
    setFilterFlowcat(null);
    setCurrentPage(1);
    toast.success("Filtros limpiados");
  };
  
  // Check if any filter is active
  const hasActiveFilters = searchTerm || productoSearch || filterStatus !== "all" || filterApprovalStatus !== "all" || filterTipo !== "all" || filterRuta || filterFlowcat;
  
  const getParadaAnuncios = (paradaId: number) => {
    return anuncios?.filter(a => a.paradaId === paradaId) || [];
  };

  const getParadaStatus = (parada: any) => {
    // No Disponible: Sin Display, En Construcción, o Removida — bloquea reservas
    const isNoDisponible = parada.displayPublicidad === 'No' || parada.enConstruccion || parada.removida;
    if (isNoDisponible) {
      return {
        status: "No Disponible" as const,
        anuncio: parada.anuncioId && parada.anuncioCliente &&
          (parada.anuncioEstado === "Activo" || parada.anuncioEstado === "Programado")
          ? {
              id: parada.anuncioId,
              cliente: parada.anuncioCliente,
              tipo: parada.anuncioTipo,
              fechaInicio: parada.anuncioFechaInicio,
              fechaFin: parada.anuncioFechaFin,
              estado: parada.anuncioEstado,
            }
          : null,
      };
    }
    // Ocupado: tiene anuncio activo o programado
    if (parada.anuncioId && parada.anuncioCliente && 
        (parada.anuncioEstado === "Activo" || parada.anuncioEstado === "Programado")) {
      return { 
        status: "Ocupado" as const, 
        anuncio: {
          id: parada.anuncioId,
          cliente: parada.anuncioCliente,
          tipo: parada.anuncioTipo,
          fechaInicio: parada.anuncioFechaInicio,
          fechaFin: parada.anuncioFechaFin,
          estado: parada.anuncioEstado,
        }
      };
    }
    // Disponible: condición Lista o Pendiente, sin bloqueos
    return { status: "Disponible" as const, anuncio: null };
  };

  // Apply all filters
  console.log('Filter state:', { productoSearch, searchTerm, filterStatus, filterTipo, filterRuta });
  
  const filteredParadas = paradas?.filter(p => {
    // Search filter (general search with comma-separated IDs support)
    const matchesSearch = !searchTerm || (() => {
      // Check if search contains commas (multi-ID search)
      if (searchTerm.includes(',')) {
        const ids = searchTerm.split(',').map(id => id.trim().toLowerCase());
        return ids.some(id => p.cobertizoId.toLowerCase().includes(id));
      }
      // Regular search
      return p.cobertizoId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.localizacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.direccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.ruta && p.ruta.toLowerCase().includes(searchTerm.toLowerCase()));
    })();
    
    // Producto search filter (partial match by parada producto field or anuncio producto)
    const trimmedProductoSearch = productoSearch.trim();
    const matchesProductoSearch = !trimmedProductoSearch || 
      (p.producto && p.producto.trim().toLowerCase().includes(trimmedProductoSearch.toLowerCase())) ||
      (p.anuncioProducto && p.anuncioProducto.trim().toLowerCase().includes(trimmedProductoSearch.toLowerCase()));
    
    // Debug logging
    if (trimmedProductoSearch && matchesProductoSearch) {
      console.log('Match found:', {
        cobertizoId: p.cobertizoId,
        producto: p.producto,
        searchTerm: trimmedProductoSearch
      });
    }
    
    // Status filter
    const { status } = getParadaStatus(p);
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "disponible" && status === "Disponible") ||
      (filterStatus === "ocupada" && status === "Ocupado") ||
      (filterStatus === "no_disponible" && status === "No Disponible");
    
    // Tipo filter
    const matchesTipo = filterTipo === "all" || 
      (filterTipo === "Fija" && p.tipoFormato === "Fija") ||
      (filterTipo === "Bonificación" && p.tipoFormato === "Digital");
    
    // Ruta filter
    const matchesRuta = !filterRuta || (p.ruta && p.ruta.toLowerCase().includes(filterRuta.toLowerCase()));
    
    // Flowcat filter
    const matchesFlowcat = !filterFlowcat || p.flowCat === filterFlowcat;
    
    // Approval status filter (check if any anuncio for this parada matches the approval status)
    const matchesApprovalStatus = filterApprovalStatus === "all" || 
      anuncios?.some(a => 
        a.paradaId === p.id && a.approvalStatus === filterApprovalStatus
      );
    
    return matchesSearch && matchesProductoSearch && matchesStatus && matchesTipo && matchesRuta && matchesFlowcat && matchesApprovalStatus;
  }) || [];

  // Default sort: by flowcat (numeric asc), then cobertizo number, then orientation I > O > P
  const ORIENTACION_ORDER: Record<string, number> = { 'I': 0, 'O': 1, 'P': 2 };
  const sortedFilteredParadas = [...filteredParadas].sort((a, b) => {
    // Sort by flowcat first (numeric)
    const fcA = parseInt((a.flowCat || '').replace(/[^0-9]/g, ''), 10) || 0;
    const fcB = parseInt((b.flowCat || '').replace(/[^0-9]/g, ''), 10) || 0;
    if (fcA !== fcB) return fcA - fcB;
    // Same flowcat: sort by cobertizo number
    const numA = parseInt(a.cobertizoId.replace(/[^0-9]/g, ''), 10) || 0;
    const numB = parseInt(b.cobertizoId.replace(/[^0-9]/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    // Same cobertizo: sort by letter suffix (e.g. 589A < 589B)
    const letterA = a.cobertizoId.replace(/[0-9]/g, '') || '';
    const letterB = b.cobertizoId.replace(/[0-9]/g, '') || '';
    if (letterA !== letterB) return letterA.localeCompare(letterB);
    // Same cobertizo: I first, then O, then P
    const ordA = ORIENTACION_ORDER[a.orientacion?.toUpperCase() ?? ''] ?? 9;
    const ordB = ORIENTACION_ORDER[b.orientacion?.toUpperCase() ?? ''] ?? 9;
    return ordA - ordB;
  });
  
  // Get paradas for printing with filters
  const getPrintParadas = () => {
    return paradas?.filter(p => {
      const { status } = getParadaStatus(p);
      const matchesStatus = printFilterStatus === "all" || 
        (printFilterStatus === "disponible" && status === "Disponible") ||
        (printFilterStatus === "ocupada" && status === "Ocupado") ||
        (printFilterStatus === "no_disponible" && status === "No Disponible");
      
      const matchesTipo = printFilterTipo === "all" || 
        (printFilterTipo === "Fija" && p.tipoFormato === "Fija") ||
        (printFilterTipo === "Bonificación" && p.tipoFormato === "Digital");
      
      const matchesRuta = !printFilterRuta || (p.ruta && p.ruta.toLowerCase().includes(printFilterRuta.toLowerCase()));
      
      // Flowcat filter for print
      const matchesFlowcat = !printFilterFlowcat || p.flowCat === printFilterFlowcat;
      
      // Date range filter - check if parada is available in the date range
      let matchesDateRange = true;
      if (printDateFrom || printDateTo) {
        // If status is "Disponible", it matches any date range
        if (status === "Disponible") {
          matchesDateRange = true;
        } else if (p.anuncioFechaInicio && p.anuncioFechaFin) {
          // If occupied, check if the date range overlaps with current anuncio
          const anuncioStart = new Date(p.anuncioFechaInicio);
          const anuncioEnd = new Date(p.anuncioFechaFin);
          const filterStart = printDateFrom ? new Date(printDateFrom) : new Date(0);
          const filterEnd = printDateTo ? new Date(printDateTo) : new Date(9999, 11, 31);
          
          // Parada is NOT available if anuncio overlaps with requested date range
          const overlaps = (anuncioStart <= filterEnd && anuncioEnd >= filterStart);
          matchesDateRange = !overlaps; // Available if no overlap
        }
      }
      
      return matchesStatus && matchesTipo && matchesRuta && matchesFlowcat && matchesDateRange;
    }) || [];
  };

  // Sort print paradas by flowcat (numeric asc), then cobertizo, then orientation
  const getSortedPrintParadas = () => {
    const base = getPrintParadas();
    const OO: Record<string, number> = { 'I': 0, 'O': 1, 'P': 2 };
    return [...base].sort((a, b) => {
      const fcA = parseInt((a.flowCat || '').replace(/[^0-9]/g, ''), 10) || 0;
      const fcB = parseInt((b.flowCat || '').replace(/[^0-9]/g, ''), 10) || 0;
      if (fcA !== fcB) return fcA - fcB;
      const numA = parseInt(a.cobertizoId.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.cobertizoId.replace(/[^0-9]/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      const letterA = a.cobertizoId.replace(/[0-9]/g, '') || '';
      const letterB = b.cobertizoId.replace(/[0-9]/g, '') || '';
      if (letterA !== letterB) return letterA.localeCompare(letterB);
      const ordA = OO[a.orientacion?.toUpperCase() ?? ''] ?? 9;
      const ordB = OO[b.orientacion?.toUpperCase() ?? ''] ?? 9;
      return ordA - ordB;
    });
  };
  
  // Pagination - use sortedFilteredParadas (sorted by cobertizo when Flowcat filter is active)
  const totalPages = Math.ceil(sortedFilteredParadas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParadas = sortedFilteredParadas.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleCreateAnuncio = () => {
    if (!selectedParada) return;
    
    createAnuncio.mutate({
      paradaId: selectedParada.id,
      producto: anuncioForm.producto,
      cliente: anuncioForm.cliente,
      tipo: anuncioForm.tipo,
      fechaInicio: new Date(anuncioForm.fechaInicio),
      fechaFin: new Date(anuncioForm.fechaFin),
      estado: anuncioForm.estado,
      notas: anuncioForm.notas || undefined,
    });
  };
  
  const handleCreateParada = async () => {
    const orientacion = paradaForm.orientacion || 'O';
    // Crear la parada principal
    const result = await createParada.mutateAsync({
      cobertizoId: paradaForm.cobertizoId,
      localizacion: paradaForm.localizacion,
      direccion: paradaForm.direccion,
      ruta: paradaForm.ruta || undefined,
      tipoFormato: paradaForm.tipoFormato,
      orientacion,
      flowCat: paradaForm.flowCat || undefined,
    });
    
    // Si hay foto, subirla
    if (paradaForm.fotoBase64 && result.id) {
      await uploadFoto.mutateAsync({
        paradaId: result.id,
        cobertizoId: paradaForm.cobertizoId,
        fotoBase64: paradaForm.fotoBase64,
      });
    }

    // Si la orientación es I u O, preguntar si desea crear la complementaria
    if (orientacion === 'I' || orientacion === 'O') {
      const opposite = orientacion === 'I' ? 'O' : 'I';
      const companionForm = { ...paradaForm, orientacion: opposite };
      // Detectar si ya existe una parada con el mismo cobertizoId y la orientación opuesta
      const existing = paradas?.find(
        (p: any) =>
          p.cobertizoId?.toString().trim().toLowerCase() === paradaForm.cobertizoId.trim().toLowerCase() &&
          p.orientacion?.toUpperCase() === opposite
      ) ?? null;
      setPendingCompanionForm(companionForm);
      setCompanionOrientation(opposite as 'I' | 'O');
      setDuplicateCompanion(existing);
      setIsAddParadaDialogOpen(false);
      setIsCompanionDialogOpen(true);
    }
  };

  const handleCreateCompanionParada = async () => {
    if (!pendingCompanionForm) return;
    const result = await createParada.mutateAsync({
      cobertizoId: pendingCompanionForm.cobertizoId,
      localizacion: pendingCompanionForm.localizacion,
      direccion: pendingCompanionForm.direccion,
      ruta: pendingCompanionForm.ruta || undefined,
      tipoFormato: pendingCompanionForm.tipoFormato,
      orientacion: pendingCompanionForm.orientacion || 'O',
      flowCat: pendingCompanionForm.flowCat || undefined,
    });
    if (pendingCompanionForm.fotoBase64 && result.id) {
      await uploadFoto.mutateAsync({
        paradaId: result.id,
        cobertizoId: pendingCompanionForm.cobertizoId,
        fotoBase64: pendingCompanionForm.fotoBase64,
      });
    }
    setIsCompanionDialogOpen(false);
    setPendingCompanionForm(null);
    setCompanionOrientation(null);
    toast.success(`Parada ${pendingCompanionForm.orientacion === 'I' ? 'Inbound' : 'Outbound'} creada exitosamente`);
    refetchParadas();
  };
  
  const handleDeleteParada = () => {
    if (!paradaToDelete) return;
    deleteParada.mutate({ id: paradaToDelete.id });
  };

  const handleExportToExcel = () => {
    import('xlsx').then((XLSX) => {
      // Determine which paradas to export: selected ones if any, otherwise all filtered (sorted)
      const paradasToExport = selectedParadas.length > 0 
        ? sortedFilteredParadas.filter(p => selectedParadas.includes(p.id))
        : sortedFilteredParadas;
      
      // Prepare data for export
      const exportData = paradasToExport.map(parada => {
        const { status, anuncio } = getParadaStatus(parada);
        // Condición logic
        let condicion = '';
        if (parada.removida) {
          condicion = 'Removida';
        } else if (parada.enConstruccion) {
          condicion = 'En Construcción' + (parada.fechaDisponibilidad ? ` (${new Date(parada.fechaDisponibilidad).toLocaleDateString('es-PR')})` : '');
        } else if (parada.displayPublicidad === 'No') {
          condicion = 'Sin Display';
        } else {
          const isLista = parada.condicionPintada && parada.condicionArreglada && parada.condicionLimpia;
          condicion = isLista ? 'Lista' : 'Pendiente';
        }
        return {
          'ID': parada.cobertizoId,
          'Flowcat': parada.flowCat || '',
          'Localización': parada.localizacion || '',
          'Ruta': parada.ruta || '',
          'Dirección': parada.direccion || '',
          'Orientación': parada.orientacion || '',
          'Tipo': parada.tipoFormato === 'Digital' ? 'Digital (B)' : 'Fija (F)',
          'Estado': status === 'No Disponible' ? 'No Operativa' : status,
          'Condición': condicion,
          'Anuncio Actual': parada.anuncioProducto || '',
          'Cliente Actual': anuncio ? anuncio.cliente : '',
          'Fecha Inicio': anuncio ? formatDateDisplay(anuncio.fechaInicio) : '',
          'Fecha Fin': anuncio ? formatDateDisplay(anuncio.fechaFin) : '',
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
        { wch: 8  },  // Flowcat
        { wch: 25 },  // Localización
        { wch: 15 },  // Ruta
        { wch: 40 },  // Dirección
        { wch: 12 },  // Orientación
        { wch: 15 },  // Tipo
        { wch: 14 },  // Estado
        { wch: 20 },  // Condición
        { wch: 25 },  // Anuncio Actual
        { wch: 25 },  // Cliente Actual
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
      
      // Log activity
      logActivity.mutate({
        action: `Exportó ${exportData.length} paradas a Excel`,
        entityType: 'export',
      });
      
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
      
      const printParadas = getSortedPrintParadas();
      const totalDisp = printParadas.filter(p => getParadaStatus(p).status === 'Disponible').length;
      const totalOcup = printParadas.filter(p => getParadaStatus(p).status === 'Ocupado').length;
      const rows = printParadas.map((parada) => {
        const { status, anuncio } = getParadaStatus(parada);
        const displayStatus = status === 'No Disponible' ? 'No Operativa' : status;
        // Condición logic
        let condicion = '';
        if (parada.removida) {
          condicion = 'Removida';
        } else if (parada.enConstruccion) {
          condicion = 'En Construcción' + (parada.fechaDisponibilidad ? ` (${new Date(parada.fechaDisponibilidad).toLocaleDateString('es-PR')})` : '');
        } else if (parada.displayPublicidad === 'No') {
          condicion = 'Sin Display';
        } else {
          const isLista = parada.condicionPintada && parada.condicionArreglada && parada.condicionLimpia;
          condicion = isLista ? 'Lista' : 'Pendiente';
        }
        return `<tr>
          <td>${parada.cobertizoId}</td>
          <td>${parada.flowCat || '—'}</td>
          <td>${parada.localizacion || '—'}</td>
          <td>${parada.ruta || '—'}</td>
          <td>${parada.direccion}</td>
          <td>${parada.tipoFormato === 'Digital' ? 'B' : 'F'}</td>
          <td>${displayStatus}</td>
          <td>${condicion}</td>
          <td>${anuncio?.cliente || '—'}</td>
        </tr>`;
      }).join('');
      printWindow.document.write(`
        <!DOCTYPE html><html><head>
        <title>Reporte de Paradas - Streetview Media</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
          .print-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px 14px; background: #fff; }
          .print-header img { height: 52px; display: block; }
          .print-header-right { text-align: right; }
          .doc-accent { display: inline-block; width: 32px; height: 3px; background: #ff6b35; margin-bottom: 4px; }
          .doc-title { font-size: 18px; font-weight: bold; letter-spacing: 0.5px; color: #1a4d3c; }
          .doc-meta { font-size: 10px; color: #666; margin-top: 3px; }
          .print-divider { height: 6px; background: #1a4d3c; width: 100%; }
          .print-subbar { background: #f3f4f6; padding: 6px 28px; font-size: 10px; color: #555; display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; }
          .print-subbar strong { color: #1a4d3c; }
          .stats { display: flex; gap: 16px; padding: 12px 28px; border-bottom: 1px solid #e5e7eb; }
          .stat-card { border: 1.5px solid #1a4d3c; padding: 8px 14px; border-radius: 4px; font-size: 11px; }
          .stat-card strong { color: #1a4d3c; }
          .print-body { padding: 12px 28px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1a4d3c !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
          td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
          tr:nth-child(even) { background: #f9fafb; }
          .print-footer { margin-top: 20px; padding: 10px 28px; border-top: 2px solid #1a4d3c; font-size: 9px; color: #888; display: flex; justify-content: space-between; }
          @media print {
            .print-header, .print-divider, .print-subbar, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
        </head><body>
        <div class="print-header">
          <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png" alt="Streetview Media" />
          <div class="print-header-right">
            <div class="doc-accent"></div>
            <div class="doc-title">REPORTE DE PARADAS</div>
            <div class="doc-meta">${new Date().toLocaleDateString('es-PR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>
        <div class="print-divider"></div>
        <div class="print-subbar">
          <span><strong>${printParadas.length}</strong> parada${printParadas.length !== 1 ? 's' : ''}</span>
          <span>Disponibles: ${totalDisp} &nbsp;·&nbsp; Ocupadas: ${totalOcup}</span>
        </div>
        <div class="print-body">
        <table>
          <thead><tr>
            <th>ID</th><th>Flowcat</th><th>Localización</th><th>Ruta</th><th>Dirección</th><th>Tipo</th><th>Estado</th><th>Condición</th><th>Cliente</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        </div>
        <div class="print-footer">
          <span>streetviewmediapr.com</span>
          <span>Documento de uso interno · Generado el ${new Date().toLocaleString('es-PR')}</span>
        </div>
        <script>window.onload = () => { window.print(); }<\/script>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
      
      // Log activity
      logActivity.mutate({
        action: 'Imprimió reporte de paradas',
        entityType: 'report',
      });
    }, 100);
  };
  
  const disponiblesCount = filteredParadas.filter(p => getParadaStatus(p).status === "Disponible").length;
  const ocupadasCount = filteredParadas.filter(p => getParadaStatus(p).status === "Ocupado").length;
  const noDisponiblesCount = (paradas || []).filter(p => getParadaStatus(p).status === "No Disponible").length;


  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      {/* Sidebar */}
      <AdminSidebar 
        pendingReservationsCount={pendingReservations?.length || 0}
        unreadCount={unreadCount || 0}
        onExportExcel={handleExportToExcel}
        onPrintReport={() => setIsPrintDialogOpen(true)}
      />
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
      {/* Header */}
      <nav className="hidden lg:block bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden">
        <div className="container flex items-center justify-between h-20">
          <Link href="/">
            <img 
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png" 
              alt="Streetview Media" 
              className="h-12 cursor-pointer"
            />
          </Link>
          {/* Desktop - Notification Bell Only */}
          <div className="hidden lg:flex items-center gap-3">
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
          </div>
          
          {/* Mobile - Notification Bell Only */}
          <div className="flex lg:hidden items-center gap-2">
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
          </div>
        </div>
      </nav>

      {/* Notification Panel */}
      {isNotificationPanelOpen && user?.role === 'admin' && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsNotificationPanelOpen(false)}
          />
          <div className="fixed top-20 right-4 w-96 bg-white border-2 border-[#1a4d3c] shadow-2xl z-50 max-h-[600px] flex flex-col rounded-sm">
            {/* Header */}
            <div className="p-4 border-b-2 border-[#1a4d3c] flex-shrink-0">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-display text-xl text-[#1a4d3c]">Notificaciones</h3>
                  {unreadCount && unreadCount > 0 ? (
                    <p className="text-sm text-[#ff6b35] font-medium mt-0.5">
                      Tiene {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 mt-0.5">Todas leídas</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsNotificationPanelOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={async () => {
                    try {
                      const result = await checkNotifications.mutateAsync();
                      utils.notifications.list.invalidate();
                      utils.notifications.unreadCount.invalidate();
                      toast.success(
                        `Verificación completada: ${result.overdueCount} facturas vencidas, ${result.clientsWithoutInvoiceCount} clientes sin factura, ${result.campaignsEndingSoonCount || 0} campañas por vencer. ${result.totalNotifications} notificaciones creadas.`
                      );
                    } catch (error) {
                      toast.error("Error al verificar notificaciones");
                    }
                  }}
                  disabled={checkNotifications.isPending}
                >
                  {checkNotifications.isPending ? "Verificando..." : "🔍 Verificar"}
                </Button>
                {unreadCount && unreadCount > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs text-[#1a4d3c] border-[#1a4d3c]"
                    onClick={() => markAllAsRead.mutate()}
                    disabled={markAllAsRead.isPending}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {markAllAsRead.isPending ? "Marcando..." : "Marcar todas"}
                  </Button>
                ) : null}
              </div>
            </div>
            {/* Notification List */}
            <div className="divide-y overflow-y-auto flex-1">
              {notifications && notifications.length > 0 ? (
                notifications.map((notif) => {
                  const isCampaignEnding = notif.type === 'campaign_ending_21d' || notif.type === 'campaign_ending_14d' || notif.type === 'campaign_ending_7d';
                  return (
                    <div 
                      key={notif.id} 
                      className={`p-4 transition-colors ${
                        notif.read === 0 ? 'bg-[#fff5f0] border-l-4 border-l-[#ff6b35]' : 'border-l-4 border-l-transparent'
                      }`}
                    >
                      <div
                        className="cursor-pointer hover:opacity-80"
                        onClick={() => {
                          if (notif.read === 0) {
                            markAsRead.mutate({ id: notif.id });
                          }
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-[#1a4d3c] text-sm leading-tight pr-2">{notif.title}</h4>
                          {notif.read === 0 && (
                            <span className="flex-shrink-0 w-2 h-2 bg-[#ff6b35] rounded-full mt-1"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-snug">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1.5">
                          {new Date(notif.createdAt).toLocaleString('es-PR')}
                        </p>
                      </div>
                      {/* Action buttons for campaign_ending notifications */}
                      {isCampaignEnding && notif.relatedId && (
                        <div className="flex gap-2 mt-2.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs h-7 border-[#1a4d3c] text-[#1a4d3c] hover:bg-[#1a4d3c] hover:text-white"
                            disabled={createSeguimientoFromNotif.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Parse cliente and producto from the notification message
                              // Message format: "La campaña de {cliente} ({producto}) termina en..."
                              const match = notif.message.match(/La campaña de (.+?) \((.+?)\) termina/);
                              const cliente = match ? match[1] : 'Cliente';
                              const producto = match ? match[2] : undefined;
                              createSeguimientoFromNotif.mutate({
                                notificationId: notif.id,
                                anuncioId: notif.relatedId!,
                                cliente,
                                producto,
                                fechaVencimiento: new Date().toISOString(), // will be updated from anuncio
                              });
                            }}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Dar Seguimiento
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs h-7 text-gray-500 hover:bg-gray-100"
                            disabled={ignoreNotification.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              ignoreNotification.mutate({ id: notif.id });
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Ignorar
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No hay notificaciones</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="container py-12">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-display text-3xl md:text-4xl text-[#1a4d3c] mb-2">Panel Administrativo</h1>
            <p className="text-body text-base md:text-lg text-gray-600">Gestión de paradas y anuncios</p>
          </div>
          {user?.role === 'admin' && (
            <Button 
              onClick={() => setIsAddParadaDialogOpen(true)}
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a] w-full md:w-auto"
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-[#ff6b35] flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Tienes {pendingReservations.length} reserva{pendingReservations.length !== 1 ? 's' : ''} pendiente{pendingReservations.length !== 1 ? 's' : ''} de aprobar
                  </CardTitle>
                  <CardDescription>
                    Estas reservas requieren tu aprobación antes de ser confirmadas
                  </CardDescription>
                </div>
                <Button
                  onClick={() => window.location.href = '/notificaciones'}
                  className="bg-[#ff6b35] hover:bg-[#e65a25] text-white shrink-0"
                >
                  Ir a Notificaciones
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}
        
        {/* Expiring Anuncios Alert - Collapsible Accordion */}
        {user?.role === 'admin' && expiringAnuncios && expiringAnuncios.length > 0 && (() => {
          const visibleAnuncios = expiringAnuncios.filter((a: any) => !dismissedExpiringIds.has(a.id));
          if (visibleAnuncios.length === 0) return null;
          return (
            <Card className="mb-8 border-yellow-500 bg-yellow-50 print:hidden">
              {/* Accordion Header - always visible */}
              <button
                className="w-full text-left"
                onClick={() => setIsExpiringOpen(prev => !prev)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-yellow-700 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Anuncios Próximos a Vencer
                      <Badge className="bg-yellow-500 text-white ml-1">{visibleAnuncios.length}</Badge>
                    </CardTitle>
                    <ChevronDown
                      className={`h-5 w-5 text-yellow-600 transition-transform duration-200 ${
                        isExpiringOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <CardDescription className="text-yellow-600">
                    {isExpiringOpen
                      ? `Mostrando ${visibleAnuncios.length} anuncio${visibleAnuncios.length !== 1 ? 's' : ''} que vencerán en los próximos 7 días`
                      : `Haz clic para ver los ${visibleAnuncios.length} anuncio${visibleAnuncios.length !== 1 ? 's' : ''} que vencerán en los próximos 7 días`
                    }
                  </CardDescription>
                </CardHeader>
              </button>

              {/* Accordion Body - only visible when open */}
              {isExpiringOpen && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {visibleAnuncios.map((anuncio: any) => {
                      const daysUntilExpiration = Math.ceil(
                        (new Date(anuncio.fechaFin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      );
                      const alreadyHasSeguimiento = anuncio.hasSeguimiento || seguimientoCreatedIds.has(anuncio.id);
                      return (
                        <div key={anuncio.id} className="bg-white border border-yellow-300 rounded-lg p-4">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">{anuncio.cliente}</span>
                                {anuncio.producto && (
                                  <span className="text-sm text-gray-500">({anuncio.producto})</span>
                                )}
                                <Badge variant="outline" className="text-yellow-700 border-yellow-500">
                                  Vence en {daysUntilExpiration} día{daysUntilExpiration !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600">
                                Parada: {anuncio.parada?.cobertizoId} — {anuncio.parada?.localizacion}
                              </div>
                              <div className="text-sm text-gray-500">
                                Fecha fin: {formatDateDisplay(anuncio.fechaFin)}
                              </div>
                            </div>
                            {/* Action buttons */}
                            <div className="flex gap-2 md:flex-col md:items-end shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-[#1a4d3c] text-[#1a4d3c] hover:bg-[#1a4d3c] hover:text-white"
                                disabled={createSeguimientoFromExpiring.isPending || alreadyHasSeguimiento}
                                onClick={() => {
                                  if (alreadyHasSeguimiento) return;
                                  createSeguimientoFromExpiring.mutate({
                                    anuncioId: anuncio.id,
                                    cliente: anuncio.cliente,
                                    producto: anuncio.producto,
                                    fechaVencimiento: new Date(anuncio.fechaFin).toISOString(),
                                  });
                                }}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                {alreadyHasSeguimiento ? 'Seguimiento creado' : 'Dar Seguimiento'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 text-gray-500 hover:bg-gray-100"
                                onClick={() => dismissExpiring(anuncio.id)}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Ignorar
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })()}

        {/* Search and Filters */}
        <Card className="mb-8 print:hidden">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    placeholder="Buscar por ID (separar con comas), localización, dirección o ruta..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setProductoSearch(""); }}
                    className="pl-10"
                  />
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ff6b35]" size={20} />
                    <Input
                      placeholder="Buscar por anuncio/producto..."
                      value={productoSearch}
                      onChange={(e) => { setProductoSearch(e.target.value); setSearchTerm(""); }}
                      className="pl-10 border-[#ff6b35] focus:ring-[#ff6b35]"
                    />
                  </div>
                  {productoSearch && (
                    <div className="text-sm text-gray-600 mt-1 ml-1">
                      {sortedFilteredParadas.length} resultado(s) encontrado(s)
                    </div>
                  )}
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
                  <Label>Tipo de Parada</Label>
                  <Select value={filterTipo} onValueChange={(v: any) => { setFilterTipo(v); handleFilterChange(); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="Fija">Fija</SelectItem>
                      <SelectItem value="Bonificación">Digital</SelectItem>
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
                <div>
                  <Label className="flex items-center gap-1">
                    Flowcat
                    {filterFlowcat && (
                      <span className="ml-1 text-xs bg-[#1a4d3c] text-white px-1.5 py-0.5 rounded-full">
                        {filterFlowcat}
                      </span>
                    )}
                  </Label>
                  <Select
                    value={filterFlowcat ?? "all"}
                    onValueChange={(v) => {
                      setFilterFlowcat(v === "all" ? null : v);
                      handleFilterChange();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las avenidas" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      <SelectItem value="all">Todas las avenidas</SelectItem>
                      {flowcats?.map((fc) => (
                        <SelectItem key={fc.flowCat} value={fc.flowCat}>
                          <span className="font-mono font-bold text-[#1a4d3c] mr-2">{fc.flowCat}</span>
                          {fc.localizacion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - Now clickable filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${filterStatus === "all" ? "ring-2 ring-[#1a4d3c]" : ""}`}
            onClick={() => { setFilterStatus("all"); handleFilterChange(); }}
          >
            <CardHeader>
              <CardTitle className="text-2xl">{paradas?.length || 0}</CardTitle>
              <CardDescription>Total Caras</CardDescription>
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
              <CardDescription>Caras Disponibles</CardDescription>
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
              <CardDescription>Caras Ocupadas</CardDescription>
            </CardHeader>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg border-l-4 border-red-500 ${filterStatus === "no_disponible" ? "ring-2 ring-red-500" : ""}`}
            onClick={() => { setFilterStatus(filterStatus === "no_disponible" ? "all" : "no_disponible"); handleFilterChange(); }}
          >
            <CardHeader>
              <CardTitle className="text-2xl text-red-600">
                {noDisponiblesCount}
              </CardTitle>
              <CardDescription>Caras No Operativas</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-l-4 border-[#1a4d3c]">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1a4d3c]">
                {paradasFisicasCount}
              </CardTitle>
              <CardDescription className="text-xs">Paradas Físicas</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Paradas Table */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Paradas</CardTitle>
            <CardDescription>
              Mostrando {startIndex + 1}-{Math.min(endIndex, sortedFilteredParadas.length)} de {sortedFilteredParadas.length} paradas
              {filterFlowcat && <span className="ml-2 text-xs bg-[#1a4d3c] text-white px-2 py-0.5 rounded-full">Flowcat {filterFlowcat} — ordenado por cobertizo</span>}
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
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedParadas.length === paginatedParadas.length && paginatedParadas.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedParadas(paginatedParadas.map(p => p.id));
                              } else {
                                setSelectedParadas([]);
                              }
                            }}
                            className="cursor-pointer"
                          />
                        </TableHead>

                        <TableHead>ID Cobertizo</TableHead>
                        <TableHead>Orient.</TableHead>
                        <TableHead>Localización</TableHead>
                        <TableHead>Ruta</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Tipo Parada</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Condición</TableHead>
                        <TableHead>Anuncio Actual</TableHead>
                        <TableHead className="print:hidden">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedParadas.map((parada) => {
                        const { status, anuncio } = getParadaStatus(parada);
                        return (
                          <TableRow key={parada.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedParadas.includes(parada.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedParadas([...selectedParadas, parada.id]);
                                  } else {
                                    setSelectedParadas(selectedParadas.filter(id => id !== parada.id));
                                  }
                                }}
                                className="cursor-pointer"
                              />
                            </TableCell>

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
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {parada.orientacion || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span>{parada.localizacion || "—"}</span>
                                {parada.flowCat && (
                                  <span className="text-xs font-mono text-[#1a4d3c] font-semibold">
                                    FC {parada.flowCat}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{parada.ruta || "—"}</TableCell>
                            <TableCell className="max-w-xs truncate">{parada.direccion}</TableCell>
                            <TableCell>
                              <Badge variant={parada.tipoFormato === "Digital" ? "default" : "secondary"}>
                                {parada.tipoFormato}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {status === "Disponible" && !parada.isHolder && (
                                <Badge variant="outline" className="border-green-600 text-green-700">Disponible</Badge>
                              )}
                              {status === "Disponible" && parada.isHolder && (
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="border-green-600 text-green-700">Disponible</Badge>
                                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-400 text-[10px] px-1 py-0">Disponible para venta</Badge>
                                </div>
                              )}
                              {status === "Ocupado" && (
                                <Badge variant="destructive">Ocupado</Badge>
                              )}
                              {status === "No Disponible" && (
                                <Badge className="bg-slate-500 hover:bg-slate-600 text-white">No Operativa</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                // When parada is No Disponible, show the specific reason in Condición column
                                if (parada.removida) {
                                  return <Badge className="bg-red-700 hover:bg-red-800 text-white">Removida</Badge>;
                                }
                                if (parada.enConstruccion) {
                                  return (
                                    <div className="flex flex-col gap-1">
                                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs w-fit">
                                        En Construcción
                                      </Badge>
                                      {parada.fechaDisponibilidad && (
                                        <span className="text-xs text-amber-700">
                                          Disp.: {new Date(parada.fechaDisponibilidad).toLocaleDateString("es-PR")}
                                        </span>
                                      )}
                                    </div>
                                  );
                                }
                                if (parada.displayPublicidad === 'No') {
                                  return <Badge className="bg-slate-500 hover:bg-slate-600 text-white">Sin Display</Badge>;
                                }
                                // Normal condition: Lista or Pendiente
                                const isLista = parada.condicionPintada && parada.condicionArreglada && parada.condicionLimpia;
                                return (
                                  <Badge variant={isLista ? "default" : "secondary"} className={isLista ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}>
                                    {isLista ? "Lista" : "Pendiente"}
                                  </Badge>
                                );
                              })()}
                            </TableCell>

                            <TableCell>
                              {anuncio ? (
                                <div className="text-sm">
                                  <div className="font-medium">{parada.anuncioProducto || parada.producto || anuncio.cliente}</div>
                                  <div className="text-gray-500 text-xs">
                                    {formatDateDisplay(anuncio.fechaInicio)} - {formatDateDisplay(anuncio.fechaFin)}
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
                                              input.onchange = async (e: any) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  // Compress image before upload
                                                  const compressImage = (file: File): Promise<string> => {
                                                    return new Promise((resolve) => {
                                                      const reader = new FileReader();
                                                      reader.onload = (e) => {
                                                        const img = new Image();
                                                        img.onload = () => {
                                                          const canvas = document.createElement('canvas');
                                                          const MAX_WIDTH = 1920;
                                                          const MAX_HEIGHT = 1920;
                                                          let width = img.width;
                                                          let height = img.height;

                                                          if (width > height) {
                                                            if (width > MAX_WIDTH) {
                                                              height *= MAX_WIDTH / width;
                                                              width = MAX_WIDTH;
                                                            }
                                                          } else {
                                                            if (height > MAX_HEIGHT) {
                                                              width *= MAX_HEIGHT / height;
                                                              height = MAX_HEIGHT;
                                                            }
                                                          }

                                                          canvas.width = width;
                                                          canvas.height = height;
                                                          const ctx = canvas.getContext('2d')!;
                                                          ctx.drawImage(img, 0, 0, width, height);
                                                          resolve(canvas.toDataURL('image/jpeg', 0.85));
                                                        };
                                                        img.src = e.target?.result as string;
                                                      };
                                                      reader.readAsDataURL(file);
                                                    });
                                                  };

                                                  const compressedBase64 = await compressImage(file);
                                                  await uploadFoto.mutateAsync({
                                                    paradaId: parada.id,
                                                    cobertizoId: parada.cobertizoId,
                                                    fotoBase64: compressedBase64,
                                                  });
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
                                          <Label className="text-gray-500">Tipo Parada</Label>
                                          <p className="font-medium">{parada.tipoFormato}</p>
                                        </div>
                                        <div>
                                          <Label className="text-gray-500">Localización</Label>
                                          {user?.role === 'admin' ? (
                                            <Input
                                              value={selectedParada?.localizacion || ""}
                                              onChange={(e) => {
                                                // Update local state immediately
                                                const newValue = e.target.value;
                                                setSelectedParada({ ...selectedParada, localizacion: newValue });
                                              }}
                                              onBlur={(e) => {
                                                // Save to database on blur
                                                const newValue = e.target.value;
                                                if (newValue !== parada.localizacion) {
                                                  updateParadaLocation.mutate(
                                                    { paradaId: parada.id, localizacion: newValue },
                                                    {
                                                      onSuccess: () => {
                                                        toast.success('Localización actualizada');
                                                        utils.paradas.list.invalidate();
                                                      },
                                                      onError: () => {
                                                        toast.error('Error al actualizar localización');
                                                      },
                                                    }
                                                  );
                                                }
                                              }}
                                              className="mt-1"
                                            />
                                          ) : (
                                            <p className="font-medium">{parada.localizacion || "—"}</p>
                                          )}
                                        </div>
                                        <div>
                                          <Label className="text-gray-500">Ruta</Label>
                                          {user?.role === 'admin' ? (
                                            <Input
                                              value={selectedParada?.ruta || ""}
                                              onChange={(e) => {
                                                setSelectedParada({ ...selectedParada, ruta: e.target.value });
                                              }}
                                              onBlur={(e) => {
                                                const newValue = e.target.value;
                                                if (newValue !== parada.ruta) {
                                                  updateParadaLocation.mutate(
                                                    { paradaId: parada.id, ruta: newValue },
                                                    {
                                                      onSuccess: () => {
                                                        toast.success('Ruta actualizada');
                                                        utils.paradas.list.invalidate();
                                                      },
                                                      onError: () => toast.error('Error al actualizar ruta'),
                                                    }
                                                  );
                                                }
                                              }}
                                              className="mt-1"
                                              placeholder="Ej: 01A"
                                            />
                                          ) : (
                                            <p className="font-medium">{parada.ruta || "—"}</p>
                                          )}
                                        </div>
                                        <div className="col-span-2">
                                          <Label className="text-gray-500">Dirección</Label>
                                          {user?.role === 'admin' ? (
                                            <Input
                                              value={selectedParada?.direccion || ""}
                                              onChange={(e) => {
                                                const newValue = e.target.value;
                                                setSelectedParada({ ...selectedParada, direccion: newValue });
                                              }}
                                              onBlur={(e) => {
                                                const newValue = e.target.value;
                                                if (newValue !== parada.direccion) {
                                                  updateParadaLocation.mutate(
                                                    { paradaId: parada.id, direccion: newValue },
                                                    {
                                                      onSuccess: () => {
                                                        toast.success('Dirección actualizada');
                                                        utils.paradas.list.invalidate();
                                                      },
                                                      onError: () => {
                                                        toast.error('Error al actualizar dirección');
                                                      },
                                                    }
                                                  );
                                                }
                                              }}
                                              className="mt-1"
                                            />
                                          ) : (
                                            <p className="font-medium">{parada.direccion}</p>
                                          )}
                                        </div>
                                        <div>
                                          <Label className="text-gray-500">Orientación</Label>
                                          {user?.role === 'admin' ? (
                                            <Select
                                              value={selectedParada?.orientacion || ""}
                                              onValueChange={(v) => {
                                                setSelectedParada({ ...selectedParada, orientacion: v });
                                                updateParadaLocation.mutate(
                                                  { paradaId: parada.id, orientacion: v },
                                                  {
                                                    onSuccess: () => {
                                                      toast.success('Orientación actualizada');
                                                      utils.paradas.list.invalidate();
                                                    },
                                                    onError: () => toast.error('Error al actualizar orientación'),
                                                  }
                                                );
                                              }}
                                            >
                                              <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Seleccionar" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="I">I — Inbound</SelectItem>
                                                <SelectItem value="O">O — Outbound</SelectItem>
                                                <SelectItem value="P">P — Peatonal</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          ) : (
                                            <p className="font-medium">{parada.orientacion || "—"}</p>
                                          )}
                                        </div>
                                        <div>
                                          <Label className="text-gray-500">Flowcat</Label>
                                          {user?.role === 'admin' ? (
                                            <Select
                                              value={selectedParada?.flowCat || ""}
                                              onValueChange={(v) => {
                                                const newVal = v === "none" ? "" : v;
                                                setSelectedParada({ ...selectedParada, flowCat: newVal });
                                                updateParadaLocation.mutate(
                                                  { paradaId: parada.id, flowCat: newVal || undefined },
                                                  {
                                                    onSuccess: () => {
                                                      toast.success('Flowcat actualizado');
                                                      utils.paradas.list.invalidate();
                                                    },
                                                    onError: () => toast.error('Error al actualizar Flowcat'),
                                                  }
                                                );
                                              }}
                                            >
                                              <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Seleccionar avenida" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="none">— Sin asignar —</SelectItem>
                                                {flowcats?.map((fc) => (
                                                  <SelectItem key={fc.flowCat} value={fc.flowCat}>
                                                    <span className="font-mono font-bold mr-2">{fc.flowCat}</span>
                                                    <span className="text-sm truncate max-w-[200px] block">{fc.localizacion}</span>
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          ) : (
                                            <p className="font-medium">{parada.flowCat || "—"}</p>
                                          )}
                                        </div>
                                        <div>
                                          <Label className="text-gray-500">Estado</Label>
                                          {status === "Disponible" && <Badge variant="outline" className="border-green-600 text-green-700">Disponible</Badge>}
                                          {status === "Ocupado" && <Badge variant="destructive">Ocupado</Badge>}
                                          {status === "No Disponible" && <Badge className="bg-slate-500 text-white">No Operativa</Badge>}
                                        </div>
                                      </div>
                                      
                                      {/* Condition Section */}

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
                                                <Label className="text-gray-500">Tipo Anuncio</Label>
                                                <p className="font-medium">{anuncio.tipo}</p>
                                              </div>
                                              <div>
                                                <Label className="text-gray-500">Estado</Label>
                                                {user?.role === 'admin' ? (
                                                  <Select
                                                    value={anuncio.estado}
                                                    onValueChange={(newEstado) => {
                                                      updateAnuncioStatus.mutate(
                                                        { id: anuncio.id, estado: newEstado as any },
                                                        {
                                                          onSuccess: () => {
                                                            toast.success('Estado actualizado');
                                                            utils.paradas.list.invalidate();
                                                          },
                                                          onError: () => {
                                                            toast.error('Error al actualizar estado');
                                                          },
                                                        }
                                                      );
                                                    }}
                                                  >
                                                    <SelectTrigger className="w-[180px]">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="Disponible">Disponible</SelectItem>
                                                      <SelectItem value="Activo">Activo</SelectItem>
                                                      <SelectItem value="Programado">Programado</SelectItem>
                                                      <SelectItem value="Finalizado">Finalizado</SelectItem>
                                                      <SelectItem value="Inactivo">Inactivo</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                ) : (
                                                  <Badge>{anuncio.estado}</Badge>
                                                )}
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Label className="text-gray-500">Fecha Inicio</Label>
                                                <p className="font-medium">{formatDateDisplay(anuncio.fechaInicio)}</p>
                                              </div>
                                              <div>
                                                <Label className="text-gray-500">Fecha Fin</Label>
                                                <p className="font-medium">{formatDateDisplay(anuncio.fechaFin)}</p>
                                              </div>
                                            </div>

                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  disabled={parada.displayPublicidad === 'No'}
                                  title={parada.displayPublicidad === 'No' ? 'Sin display — no disponible para anuncios' : 'Agregar anuncio'}
                                  onClick={() => {
                                    setSelectedParada(parada);
                                    setIsAnuncioDialogOpen(true);
                                  }}
                                  className={parada.displayPublicidad === 'No' ? 'opacity-30 cursor-not-allowed' : ''}
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
              <Label>Producto/Anuncio *</Label>
              <Input
                value={anuncioForm.producto}
                onChange={(e) => setAnuncioForm({ ...anuncioForm, producto: e.target.value })}
                placeholder="Ej: Coca Cola, iPhone 15, etc."
              />
            </div>
            <div>
              <Label>Cliente *</Label>
              <Input
                value={anuncioForm.cliente}
                onChange={(e) => setAnuncioForm({ ...anuncioForm, cliente: e.target.value })}
                placeholder="Ej: Coca Cola Company, Apple Inc., etc."
              />
            </div>
            <div>
              <Label>Tipo de Anuncio</Label>
              <Select value={anuncioForm.tipo} onValueChange={(v: any) => setAnuncioForm({ ...anuncioForm, tipo: v })}>
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
                  <SelectItem value="Disponible">Disponible</SelectItem>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Programado">Programado</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
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
              disabled={!anuncioForm.producto || !anuncioForm.cliente || !anuncioForm.fechaInicio || !anuncioForm.fechaFin}
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
              <Label>Tipo de Parada *</Label>
              <Select value={paradaForm.tipoFormato} onValueChange={(v: any) => setParadaForm({ ...paradaForm, tipoFormato: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fija">Fija</SelectItem>
                  <SelectItem value="Digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Orientación</Label>
              <Select value={paradaForm.orientacion || ""} onValueChange={(v) => setParadaForm({ ...paradaForm, orientacion: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar orientación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I">I — Inbound</SelectItem>
                  <SelectItem value="O">O — Outbound</SelectItem>
                  <SelectItem value="P">P — Peatonal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Flowcat (Avenida)</Label>
              <Select value={paradaForm.flowCat || ""} onValueChange={(v) => setParadaForm({ ...paradaForm, flowCat: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar avenida" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin asignar —</SelectItem>
                  {flowcats?.map((fc) => (
                    <SelectItem key={fc.flowCat} value={fc.flowCat}>
                      <span className="font-mono font-bold mr-2">{fc.flowCat}</span>
                      <span className="text-sm truncate">{fc.localizacion}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
      
      {/* Companion Parada Dialog */}
      <AlertDialog open={isCompanionDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCompanionDialogOpen(false);
          setPendingCompanionForm(null);
          setCompanionOrientation(null);
          setDuplicateCompanion(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {duplicateCompanion ? (
                <><AlertTriangle className="h-5 w-5 text-amber-500" /> Parada {companionOrientation === 'I' ? 'Inbound' : 'Outbound'} ya existe</>
              ) : (
                <><span className="text-2xl">{companionOrientation === 'I' ? '⬅️' : '➡️'}</span> ¿Crear parada {companionOrientation === 'I' ? 'Inbound' : 'Outbound'}?</>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {duplicateCompanion ? (
                  <>
                    <p className="text-amber-700 font-medium">
                      Ya existe una parada <strong>{companionOrientation === 'I' ? 'Inbound (I)' : 'Outbound (O)'}</strong> con el mismo ID de cobertizo:
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-left space-y-1">
                      <div><span className="font-medium text-gray-600">ID Cobertizo:</span> {duplicateCompanion.cobertizoId}</div>
                      <div><span className="font-medium text-gray-600">Localización:</span> {duplicateCompanion.localizacion}</div>
                      <div><span className="font-medium text-gray-600">Dirección:</span> {duplicateCompanion.direccion}</div>
                      {duplicateCompanion.ruta && <div><span className="font-medium text-gray-600">Ruta:</span> {duplicateCompanion.ruta}</div>}
                      <div><span className="font-medium text-gray-600">Orientación:</span> <strong>{companionOrientation === 'I' ? 'I — Inbound' : 'O — Outbound'}</strong></div>
                    </div>
                    <p className="text-sm text-gray-500">No se creará un duplicado. Puedes cerrar este diálogo.</p>
                  </>
                ) : (
                  <>
                    <p>
                      La parada fue creada. ¿Deseas crear también la versión{' '}
                      <strong>{companionOrientation === 'I' ? 'Inbound (I)' : 'Outbound (O)'}</strong>{' '}
                      con los mismos datos?
                    </p>
                    {pendingCompanionForm && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-left space-y-1 border">
                        <div><span className="font-medium text-gray-600">ID Cobertizo:</span> {pendingCompanionForm.cobertizoId}</div>
                        <div><span className="font-medium text-gray-600">Localización:</span> {pendingCompanionForm.localizacion}</div>
                        <div><span className="font-medium text-gray-600">Dirección:</span> {pendingCompanionForm.direccion}</div>
                        {pendingCompanionForm.ruta && <div><span className="font-medium text-gray-600">Ruta:</span> {pendingCompanionForm.ruta}</div>}
                        {pendingCompanionForm.flowCat && <div><span className="font-medium text-gray-600">Flowcat:</span> {pendingCompanionForm.flowCat}</div>}
                        <div><span className="font-medium text-gray-600">Tipo:</span> {pendingCompanionForm.tipoFormato}</div>
                        <div><span className="font-medium text-gray-600">Orientación:</span> <strong>{companionOrientation === 'I' ? 'I — Inbound' : 'O — Outbound'}</strong></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsCompanionDialogOpen(false);
              setPendingCompanionForm(null);
              setCompanionOrientation(null);
              setDuplicateCompanion(null);
            }}>
              {duplicateCompanion ? 'Cerrar' : 'No, solo esta'}
            </AlertDialogCancel>
            {!duplicateCompanion && (
              <AlertDialogAction
                onClick={handleCreateCompanionParada}
                disabled={createParada.isPending}
                className="bg-[#1a4d3c] hover:bg-[#0f3a2a]"
              >
                {createParada.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</>
                ) : (
                  `Sí, crear ${companionOrientation === 'I' ? 'Inbound' : 'Outbound'}`
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  <SelectItem value="no_disponible">No Operativas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Parada</Label>
              <Select value={printFilterTipo} onValueChange={(v: any) => setPrintFilterTipo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Fija">Fija</SelectItem>
                  <SelectItem value="Bonificación">Digital</SelectItem>
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
            <div>
              <Label className="flex items-center gap-1">
                Flowcat (Avenida)
                {printFilterFlowcat && (
                  <span className="ml-1 text-xs bg-[#1a4d3c] text-white px-1.5 py-0.5 rounded-full">
                    {printFilterFlowcat}
                  </span>
                )}
              </Label>
              <Select
                value={printFilterFlowcat ?? "all"}
                onValueChange={(v) => setPrintFilterFlowcat(v === "all" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las avenidas" />
                </SelectTrigger>
                <SelectContent className="max-h-56 overflow-y-auto">
                  <SelectItem value="all">Todas las avenidas</SelectItem>
                  {flowcats?.map((fc) => (
                    <SelectItem key={fc.flowCat} value={fc.flowCat}>
                      <span className="font-mono font-bold text-[#1a4d3c] mr-2">{fc.flowCat}</span>
                      {fc.localizacion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {printFilterFlowcat && (
                <p className="text-xs text-[#1a4d3c] mt-1">
                  Ordenado por cobertizo (I primero)
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="printDateFrom">Disponible Desde</Label>
                <Input
                  id="printDateFrom"
                  type="date"
                  value={printDateFrom}
                  onChange={(e) => setPrintDateFrom(e.target.value)}
                  placeholder="Fecha inicio"
                />
              </div>
              <div>
                <Label htmlFor="printDateTo">Disponible Hasta</Label>
                <Input
                  id="printDateTo"
                  type="date"
                  value={printDateTo}
                  onChange={(e) => setPrintDateTo(e.target.value)}
                  placeholder="Fecha fin"
                />
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                El reporte incluirá <strong>{getSortedPrintParadas().length}</strong> paradas según los filtros seleccionados.
                {printFilterFlowcat && (
                  <span className="ml-1 text-[#1a4d3c] font-medium">(Flowcat {printFilterFlowcat} — ordenado por cobertizo)</span>
                )}
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
            <strong>Total:</strong> {getSortedPrintParadas().length}
          </div>
          <div className="stat-card">
            <strong>Disponibles:</strong> {getSortedPrintParadas().filter(p => getParadaStatus(p).status === "Disponible").length}
          </div>
          <div className="stat-card">
            <strong>Ocupadas:</strong> {getSortedPrintParadas().filter(p => getParadaStatus(p).status === "Ocupado").length}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Flowcat</th>
              <th>Localización</th>
              <th>Ruta</th>
              <th>Dirección</th>
              <th>Tipo Parada</th>
              <th>Estado</th>
              <th>Cliente</th>
            </tr>
          </thead>
          <tbody>
            {getSortedPrintParadas().map((parada) => {
              const { status, anuncio } = getParadaStatus(parada);
              return (
                <tr key={parada.id}>
                  <td>{parada.cobertizoId}</td>
                  <td>{parada.flowCat || "—"}</td>
                  <td>{parada.localizacion || "—"}</td>
                  <td>{parada.ruta || "—"}</td>
                  <td>{parada.direccion}</td>
                  <td>{parada.tipoFormato === "Digital" ? "B" : "F"}</td>
                  <td>{status === "No Disponible" ? "No Operativa" : status}</td>
                  <td>{anuncio?.cliente || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Bulk Edit Dialog */}
      <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edición Masiva de Fechas</DialogTitle>
            <DialogDescription>
              Ajusta las fechas de múltiples anuncios a la vez buscando por cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Buscar por Cliente</Label>
              <Input
                placeholder="Ej: KFC, AMAZON, TATTOO..."
                value={bulkEditForm.searchCliente}
                onChange={(e) => setBulkEditForm({ ...bulkEditForm, searchCliente: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Operación</Label>
              <Select 
                value={bulkEditForm.operation} 
                onValueChange={(v: "extend" | "set") => setBulkEditForm({ ...bulkEditForm, operation: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="extend">Extender fechas existentes</SelectItem>
                  <SelectItem value="set">Establecer nuevas fechas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {bulkEditForm.operation === "extend" ? (
              <div>
                <Label>Extender por (meses)</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={bulkEditForm.months}
                  onChange={(e) => setBulkEditForm({ ...bulkEditForm, months: parseInt(e.target.value) || 3 })}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nueva Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={bulkEditForm.newFechaInicio}
                    onChange={(e) => setBulkEditForm({ ...bulkEditForm, newFechaInicio: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nueva Fecha Fin</Label>
                  <Input
                    type="date"
                    value={bulkEditForm.newFechaFin}
                    onChange={(e) => setBulkEditForm({ ...bulkEditForm, newFechaFin: e.target.value })}
                  />
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Vista previa:</strong> Se actualizarán los anuncios que contengan "{bulkEditForm.searchCliente}" en el nombre del cliente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (!bulkEditForm.searchCliente.trim()) {
                  toast.error("Ingresa un cliente para buscar");
                  return;
                }
                
                if (bulkEditForm.operation === "set" && (!bulkEditForm.newFechaInicio || !bulkEditForm.newFechaFin)) {
                  toast.error("Ingresa ambas fechas");
                  return;
                }
                
                // Call bulk edit mutation
                bulkUpdateDates.mutate({
                  searchCliente: bulkEditForm.searchCliente,
                  operation: bulkEditForm.operation,
                  months: bulkEditForm.operation === "extend" ? bulkEditForm.months : undefined,
                  newFechaInicio: bulkEditForm.operation === "set" && bulkEditForm.newFechaInicio ? new Date(bulkEditForm.newFechaInicio) : undefined,
                  newFechaFin: bulkEditForm.operation === "set" && bulkEditForm.newFechaFin ? new Date(bulkEditForm.newFechaFin) : undefined,
                });
              }}
              className="bg-[#ff6b35] hover:bg-[#e65a25]"
            >
              Aplicar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
