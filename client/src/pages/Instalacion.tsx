import { useState, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Eye,
  Camera,
  CheckCircle2,
  Package,
  Navigation,
  FileText,
  Loader2,
  Image as ImageIcon,
  X,
  Bell,
  Upload,
  History,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

type InstalacionItem = {
  id: number;
  anuncioId: number;
  paradaId: number;
  estado: "Programado" | "Relocalizacion" | "Instalado";
  fotoInstalacion: string | null;
  instaladoAt: Date | null;
  instaladoPor: string | null;
  notas: string | null;
  arteUrl: string | null;
  createdAt: Date;
  producto: string;
  cliente: string;
  tipo: "Fijo" | "Bonificación";
  fechaInicio: Date;
  fechaFin: Date;
  estadoAnuncio: string;
  cobertizoId: string;
  orientacion: string;
  direccion: string;
  localizacion: string;
  flowCat: string | null;
  coordenadasLat: string | null;
  coordenadasLng: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  if (estado === "Programado")
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold">
        Programado
      </Badge>
    );
  if (estado === "Relocalizacion")
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold">
        Relocalización
      </Badge>
    );
  return (
    <Badge className="bg-green-100 text-green-800 border-green-300 font-semibold">
      Instalado
    </Badge>
  );
}

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PR", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function openGps(lat: string | null, lng: string | null, direccion: string) {
  if (lat && lng) {
    const url = `https://maps.google.com/?q=${lat},${lng}`;
    window.open(url, "_blank");
  } else {
    const url = `https://maps.google.com/?q=${encodeURIComponent(direccion)}`;
    window.open(url, "_blank");
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Instalacion() {
  const utils = trpc.useUtils();
  const { user } = useAuth();

  // Notification count (for sidebar badge)
  const { data: pendingReservations } = trpc.approvals.pending.useQuery(undefined, { enabled: !!user && user.role === 'admin' });
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, { enabled: !!user });

  // Data
  const { data: instalaciones = [], isLoading } = trpc.instalaciones.list.useQuery();
  const { data: historial = [], isLoading: isLoadingHistorial } = trpc.instalaciones.historial.useQuery();

  // Mutations
  const markInstalado = trpc.instalaciones.markInstalado.useMutation({
    onSuccess: () => {
      utils.instalaciones.list.invalidate();
      // Also invalidate anuncios so Gestor de Anuncios reflects the Activo status immediately
      utils.anuncios.list.invalidate();
      toast.success("El anuncio fue marcado como instalado y activado.");
    },
    onError: (e) => toast.error(e.message),
  });

  const backfill = trpc.instalaciones.backfill.useMutation({
    onSuccess: (result) => {
      utils.instalaciones.list.invalidate();
      toast.success(`Sincronización completa: ${result.created} anuncios agregados, ${result.skipped} ya existían.`);
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadFoto = trpc.instalaciones.uploadFoto.useMutation({
    onSuccess: () => {
      utils.instalaciones.list.invalidate();
      toast.success("La foto de instalación fue guardada.");
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadArte = trpc.instalaciones.uploadArte.useMutation({
    onSuccess: (result) => {
      utils.instalaciones.list.invalidate();
      utils.instalaciones.historial.invalidate();
      toast.success("Arte del anuncio actualizado.");
      // Update the local artDialogItem to show the new image
      if (artDialogItem) {
        setArtDialogItem({ ...artDialogItem, arteUrl: result.url });
      }
      setPendingArteUrl(null);
      setPendingArteBase64(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkUploadArte = trpc.instalaciones.bulkUploadArte.useMutation({
    onSuccess: (result) => {
      utils.instalaciones.list.invalidate();
      utils.instalaciones.historial.invalidate();
      toast.success(`Arte aplicado a ${result.count} anuncio(s) del mismo cliente.`);
      setPendingArteUrl(null);
      setPendingArteBase64(null);
      setArtDialogItem(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // Filters
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterFlowcat, setFilterFlowcat] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Dialogs
  const [artDialogItem, setArtDialogItem] = useState<InstalacionItem | null>(null);
  const [fotoDialogItem, setFotoDialogItem] = useState<InstalacionItem | null>(null);
  const [confirmInstalado, setConfirmInstalado] = useState<InstalacionItem | null>(null);
  const [pendingFotoUrl, setPendingFotoUrl] = useState<string | null>(null);
  const [pendingFotoBase64, setPendingFotoBase64] = useState<string | null>(null);
  const [pendingFotoMime, setPendingFotoMime] = useState<string>("image/jpeg");
  // Arte upload state
  const [pendingArteUrl, setPendingArteUrl] = useState<string | null>(null);
  const [pendingArteBase64, setPendingArteBase64] = useState<string | null>(null);
  const [pendingArteMime, setPendingArteMime] = useState<string>("image/jpeg");
  const arteInputRef = useRef<HTMLInputElement>(null);

  const fotoInputRef = useRef<HTMLInputElement>(null);

  // Distinct flowcats from data
  const flowcats = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of instalaciones) {
      if (item.flowCat && !seen.has(item.flowCat)) {
        seen.add(item.flowCat);
        result.push(item.flowCat);
      }
    }
    return result.sort();
  }, [instalaciones]);

  // Filtered list
  const filtered = useMemo(() => {
    return instalaciones.filter((item) => {
      if (filterEstado !== "all" && item.estado !== filterEstado) return false;
      if (filterFlowcat !== "all" && item.flowCat !== filterFlowcat) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !item.cobertizoId.toLowerCase().includes(q) &&
          !item.producto.toLowerCase().includes(q) &&
          !item.cliente.toLowerCase().includes(q) &&
          !item.direccion.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [instalaciones, filterEstado, filterFlowcat, search]);

  // Selection helpers
  const allSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };
  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Photo file pick
  // Compress image to max 1920x1920, JPEG quality 85% — same as paradas photos
  const compressImage = (file: File): Promise<{ base64: string; dataUrl: string; mime: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64 = dataUrl.split(',')[1];
          resolve({ base64, dataUrl, mime: 'image/jpeg' });
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFotoFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64, dataUrl, mime } = await compressImage(file);
    setPendingFotoBase64(base64);
    setPendingFotoMime(mime);
    setPendingFotoUrl(dataUrl);
  };

  const handleConfirmInstalado = async () => {
    if (!confirmInstalado) return;
    await markInstalado.mutateAsync({
      instalacionId: confirmInstalado.id,
      fotoInstalacion: pendingFotoBase64
        ? `data:${pendingFotoMime};base64,${pendingFotoBase64}`
        : undefined,
    });
    setConfirmInstalado(null);
    setPendingFotoUrl(null);
    setPendingFotoBase64(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(confirmInstalado.id);
      return next;
    });
  };

  const handleUploadFoto = async () => {
    if (!fotoDialogItem || !pendingFotoBase64) return;
    await uploadFoto.mutateAsync({
      instalacionId: fotoDialogItem.id,
      fileBase64: pendingFotoBase64,
      mimeType: pendingFotoMime,
    });
    setFotoDialogItem(null);
    setPendingFotoUrl(null);
    setPendingFotoBase64(null);
  };

  // Arte file pick handler — with same compression as paradas photos
  const handleArteFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64, dataUrl, mime } = await compressImage(file);
    setPendingArteBase64(base64);
    setPendingArteMime(mime);
    setPendingArteUrl(dataUrl);
  };

  const handleUploadArte = async () => {
    if (!artDialogItem || !pendingArteBase64) return;
    await uploadArte.mutateAsync({
      anuncioId: artDialogItem.anuncioId,
      fileBase64: pendingArteBase64,
      mimeType: pendingArteMime,
    });
  };

  // Get anuncioIds from selected items that share the same client as artDialogItem
  const sameClientAnuncioIds = artDialogItem
    ? instalaciones
        .filter((i) => selectedIds.has(i.id) && i.cliente === artDialogItem.cliente)
        .map((i) => i.anuncioId)
    : [];

  const handleBulkUploadArte = async () => {
    if (!pendingArteBase64 || sameClientAnuncioIds.length === 0) return;
    await bulkUploadArte.mutateAsync({
      anuncioIds: sameClientAnuncioIds,
      fileBase64: pendingArteBase64,
      mimeType: pendingArteMime,
    });
  };

  // Generate installation order (print)
  const handleGenerateOrder = () => {
    const items = filtered.filter((i) => selectedIds.has(i.id));
    if (items.length === 0) {
      toast.error("Selecciona al menos un anuncio para generar la orden.");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = items
      .map(
        (item) => {
          const gpsUrl = item.coordenadasLat && item.coordenadasLng
            ? `https://maps.google.com/?q=${item.coordenadasLat},${item.coordenadasLng}`
            : `https://maps.google.com/?q=${encodeURIComponent(item.direccion + ', Puerto Rico')}`;
          return `
      <tr>
        <td>${item.flowCat ?? "—"}</td>
        <td>${item.cobertizoId}</td>
        <td>${item.orientacion}</td>
        <td>
          ${item.direccion}<br/>
          <a href="${gpsUrl}" class="gps-link" target="_blank">&#x1F4CD; Ver en Google Maps</a>
        </td>
        <td>${item.localizacion ?? '—'}</td>
        <td>${item.producto}</td>
        <td>${item.cliente}</td>
        <td>${item.tipo === 'Fijo' ? 'F' : 'B'}</td>
        <td>${formatDate(item.fechaInicio)}</td>
        <td>${formatDate(item.fechaFin)}</td>
        <td>${item.estado}</td>
        <td class="arte-cell">${item.arteUrl
          ? `<img src="${item.arteUrl}" class="arte-thumb" alt="Arte" />`
          : '<span class="no-arte">Sin arte</span>'
        }</td>
      </tr>`;
        }
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orden de Instalación</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 0; color: #1a1a1a; }
          /* ── Header ── */
          .print-header {
            background: #ffffff;
            padding: 16px 28px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 6px solid #1a4d3c;
          }
          .print-header img { height: 52px; display: block; }
          .print-header-right { text-align: right; color: #1a1a1a; }
          .print-header-right .doc-title { font-size: 18px; font-weight: bold; letter-spacing: 0.5px; color: #1a4d3c; }
          .print-header-right .doc-meta { font-size: 10px; color: #666; margin-top: 3px; }
          .print-header-right .doc-accent { display: inline-block; width: 32px; height: 3px; background: #ff6b35; margin-bottom: 4px; }
          /* ── Sub-bar ── */
          .print-subbar {
            background: #f8f8f8;
            border-bottom: 1px solid #e0e0e0;
            padding: 7px 28px;
            display: flex;
            gap: 24px;
            font-size: 10px;
            color: #555;
          }
          .print-subbar span strong { color: #1a4d3c; }
          /* ── Content ── */
          .print-body { padding: 20px 28px; }
          table { width: 100%; border-collapse: collapse; margin-top: 0; }
          th { background: #1a4d3c; color: white; padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
          td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
          tr:nth-child(even) td { background: #f9fafb; }
          .arte-thumb { width: 64px; height: 48px; object-fit: cover; border-radius: 3px; border: 1px solid #d1d5db; display: block; }
          .no-arte { color: #9ca3af; font-style: italic; font-size: 9px; }
          .gps-link { color: #1a4d3c; font-size: 9px; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 2px; }
          .gps-link:hover { text-decoration: underline; }
          /* ── Footer ── */
          .print-footer {
            margin-top: 24px;
            padding: 12px 28px;
            border-top: 2px solid #1a4d3c;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #888;
          }
          @media print {
            .print-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-subbar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png" alt="Streetview Media" />
          <div class="print-header-right">
            <div class="doc-accent"></div>
            <div class="doc-title">ORDEN DE INSTALACIÓN</div>
            <div class="doc-meta">Generada: ${new Date().toLocaleDateString("es-PR", { year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
        </div>
        <div class="print-subbar">
          <span><strong>${items.length}</strong> anuncio(s) seleccionado(s)</span>
          <span><strong>Fecha de impresión:</strong> ${new Date().toLocaleTimeString("es-PR", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div class="print-body">
        <table>
          <thead>
            <tr>
              <th>Flowcat</th><th>Cobertizo</th><th>Orient.</th><th>Dirección</th><th>Localización</th>
              <th>Producto</th><th>Cliente</th><th>Tipo</th>
              <th>F. Inicio</th><th>F. Fin</th><th>Estado</th><th>Arte</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        </div>
        <div class="print-footer">
          <span>Streetview Media · streetviewmediapr.com</span>
          <span>Documento generado automáticamente — uso interno</span>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      {/* Sidebar */}
      <AdminSidebar
        pendingReservationsCount={Array.isArray(pendingReservations) ? pendingReservations.length : 0}
        unreadCount={unreadCount}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
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
            <div className="flex items-center gap-3">
              {user?.role === 'admin' && (
                <div className="relative">
                  <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#ff6b35] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a4d3c] flex items-center gap-2">
            <Package className="w-6 h-6" />
            Instalación
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Anuncios programados y relocalizaciones pendientes de instalación en campo
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => backfill.mutate()}
            disabled={backfill.isPending}
            className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
            title="Sincronizar anuncios Programados existentes que no aparecen en esta lista"
          >
            {backfill.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            Sincronizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateOrder}
            disabled={selectedIds.size === 0}
            className="gap-1.5"
          >
            <FileText className="w-4 h-4" />
            Orden de Instalación ({selectedIds.size})
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-blue-200">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <div className="text-xl font-bold text-blue-700">
                {instalaciones.filter((i) => i.estado === "Programado").length}
              </div>
              <div className="text-xs text-muted-foreground">Programados</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Navigation className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <div className="text-xl font-bold text-amber-700">
                {instalaciones.filter((i) => i.estado === "Relocalizacion").length}
              </div>
              <div className="text-xs text-muted-foreground">Relocalizaciones</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 col-span-2 md:col-span-1">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-700">{instalaciones.length}</div>
              <div className="text-xs text-muted-foreground">Total pendientes</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar cobertizo, producto, cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs h-8 text-sm"
            />
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="Programado">Programado</SelectItem>
                <SelectItem value="Relocalizacion">Relocalización</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFlowcat} onValueChange={setFilterFlowcat}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue placeholder="Flowcat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los flowcats</SelectItem>
                {flowcats.map((fc) => (
                  <SelectItem key={fc} value={fc}>
                    {fc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterEstado !== "all" || filterFlowcat !== "all" || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-sm"
                onClick={() => {
                  setFilterEstado("all");
                  setFilterFlowcat("all");
                  setSearch("");
                }}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            {filtered.length} anuncio(s) pendientes de instalación
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay anuncios pendientes de instalación</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="w-10 px-3 py-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Seleccionar todos"
                      />
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      Flowcat
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      Cobertizo
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      Orient.
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide min-w-[180px]">
                      Dirección
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide min-w-[140px]">
                      Localización
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      Producto
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      Tipo
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      F. Inicio
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      F. Fin
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      Estado
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      Arte
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b hover:bg-muted/30 transition-colors ${
                        selectedIds.has(item.id) ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleOne(item.id)}
                          aria-label={`Seleccionar ${item.cobertizoId}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono font-bold text-[#1a4d3c] text-xs">
                          {item.flowCat ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-xs">
                        {item.cobertizoId}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {item.orientacion}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[220px] truncate">
                        {item.direccion}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[160px] truncate">
                        {item.localizacion ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-medium text-xs max-w-[160px] truncate">
                        {item.producto}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <Badge
                          variant="outline"
                          className={
                            item.tipo === "Fijo"
                              ? "border-[#1a4d3c] text-[#1a4d3c]"
                              : "border-[#ff6b35] text-[#ff6b35]"
                          }
                        >
                          {item.tipo === "Fijo" ? "F" : "B"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {formatDate(item.fechaInicio)}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {formatDate(item.fechaFin)}
                      </td>
                      <td className="px-3 py-2">{estadoBadge(item.estado)}</td>
                      <td className="px-3 py-2">
                        {item.arteUrl ? (
                          <button
                            onClick={() => setArtDialogItem(item)}
                            title="Ver arte del anuncio"
                            className="block rounded overflow-hidden border border-purple-200 hover:border-purple-400 transition-colors"
                          >
                            <img
                              src={item.arteUrl}
                              alt="Arte"
                              className="w-16 h-12 object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                            />
                          </button>
                        ) : (
                          <button
                            onClick={() => setArtDialogItem(item)}
                            title="Subir arte del anuncio"
                            className="w-16 h-12 rounded border border-dashed border-gray-300 hover:border-purple-400 flex items-center justify-center bg-gray-50 hover:bg-purple-50 transition-colors"
                          >
                            <ImageIcon className="w-4 h-4 text-gray-300 hover:text-purple-400" />
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {/* GPS */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            title="Abrir en Maps"
                            onClick={() =>
                              openGps(item.coordenadasLat, item.coordenadasLng, item.direccion)
                            }
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </Button>

                          {/* Ver arte */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                            title="Ver arte del anuncio"
                            onClick={() => setArtDialogItem(item)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {/* Foto instalación */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${
                              item.fotoInstalacion
                                ? "text-green-600 hover:text-green-800 hover:bg-green-50"
                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                            }`}
                            title={item.fotoInstalacion ? "Ver/cambiar foto instalación" : "Subir foto instalación"}
                            onClick={() => {
                              setPendingFotoUrl(null);
                              setPendingFotoBase64(null);
                              setFotoDialogItem(item);
                            }}
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </Button>

                          {/* Marcar instalado */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#1a4d3c] hover:text-[#0f3a2a] hover:bg-green-50"
                            title="Marcar como Instalado"
                            onClick={() => {
                              setPendingFotoUrl(null);
                              setPendingFotoBase64(null);
                              setConfirmInstalado(item);
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Historial de Instalaciones ─────────────────────────────────── */}
      <Card className="mt-4">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-[#1a4d3c]" />
              Historial de Instalaciones Completadas
            </CardTitle>
            {historial.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-7 border-[#1a4d3c] text-[#1a4d3c] hover:bg-green-50"
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (!printWindow) return;
                  const rows = historial.map((h) => `
                    <tr>
                      <td>${h.flowCat || "—"}</td>
                      <td>${h.cobertizoId}</td>
                      <td>${h.orientacion}</td>
                      <td>${h.direccion || "—"}</td>
                      <td>${h.localizacion || "—"}</td>
                      <td>${h.producto}</td>
                      <td>${h.cliente}</td>
                      <td>${h.tipo}</td>
                      <td>${h.fechaInicio ? new Date(h.fechaInicio).toLocaleDateString("es-PR") : "—"}</td>
                      <td>${h.fechaFin ? new Date(h.fechaFin).toLocaleDateString("es-PR") : "—"}</td>
                      <td>${h.instaladoAt ? new Date(h.instaladoAt).toLocaleDateString("es-PR") : "—"}</td>
                      <td>${h.instaladoPor || "—"}</td>
                      <td>${h.fotoInstalacion ? `<img src="${h.fotoInstalacion}" style="max-width:80px;max-height:60px;object-fit:contain" />` : "—"}</td>
                    </tr>
                  `).join("");
                  printWindow.document.write(`
                    <!DOCTYPE html><html><head>
                    <title>Historial de Instalaciones</title>
                    <style>
                      body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
                      h2 { color: #1a4d3c; margin-bottom: 4px; }
                      p { color: #666; margin-bottom: 16px; font-size: 10px; }
                      table { width: 100%; border-collapse: collapse; }
                      th { background: #1a4d3c; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
                      td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
                      tr:nth-child(even) { background: #f9fafb; }
                    </style>
                    </head><body>
                    <h2>Historial de Instalaciones Completadas</h2>
                    <p>Generado el ${new Date().toLocaleDateString("es-PR", { year: "numeric", month: "long", day: "numeric" })}</p>
                    <table>
                      <thead><tr>
                        <th>Flowcat</th><th>Cobertizo</th><th>Orient.</th><th>Dirección</th><th>Localización</th>
                        <th>Producto</th><th>Cliente</th><th>Tipo</th>
                        <th>Inicio</th><th>Fin</th><th>Instalado</th><th>Por</th><th>Foto</th>
                      </tr></thead>
                      <tbody>${rows}</tbody>
                    </table>
                    </body></html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                }}
              >
                <FileText className="w-3.5 h-3.5" />
                Generar Reporte
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingHistorial ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay instalaciones completadas aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">Flowcat</th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">Cobertizo</th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">Orient.</th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">Producto / Cliente</th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">Tipo</th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">Fecha Instalación</th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">Instalado por</th>
                    <th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">Foto</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs font-mono">{h.flowCat || "—"}</Badge>
                      </td>
                      <td className="px-3 py-2 font-medium">{h.cobertizoId}</td>
                      <td className="px-3 py-2">
                        <Badge className={`text-xs ${
                          h.orientacion === "I" ? "bg-blue-100 text-blue-800" :
                          h.orientacion === "O" ? "bg-purple-100 text-purple-800" :
                          "bg-gray-100 text-gray-700"
                        }`}>{h.orientacion}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-xs">{h.producto}</div>
                        <div className="text-xs text-muted-foreground">{h.cliente}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs">{h.tipo}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {h.instaladoAt ? new Date(h.instaladoAt).toLocaleDateString("es-PR") : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{h.instaladoPor || "—"}</td>
                      <td className="px-3 py-2">
                        {h.fotoInstalacion ? (
                          <button
                            onClick={() => window.open(h.fotoInstalacion!, "_blank")}
                            className="block"
                            title="Ver foto"
                          >
                            <img
                              src={h.fotoInstalacion}
                              alt="Foto instalación"
                              className="w-12 h-10 object-cover rounded border hover:opacity-80 transition-opacity"
                            />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Art Preview Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!artDialogItem} onOpenChange={() => { setArtDialogItem(null); setPendingArteUrl(null); setPendingArteBase64(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              Arte del Anuncio — {artDialogItem?.cobertizoId} ({artDialogItem?.orientacion})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{artDialogItem?.producto}</span>
              {" · "}
              <span className="text-[#1a4d3c] font-medium">{artDialogItem?.cliente}</span>
            </div>

            {/* Current or preview arte */}
            {pendingArteUrl ? (
              <div className="rounded-md border overflow-hidden relative">
                <img src={pendingArteUrl} alt="Preview" className="w-full object-contain max-h-72" />
                <Button
                  variant="ghost" size="icon"
                  className="absolute top-1 right-1 h-6 w-6 bg-white/80 hover:bg-white"
                  onClick={() => { setPendingArteUrl(null); setPendingArteBase64(null); }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : artDialogItem?.arteUrl ? (
              <div className="rounded-md border overflow-hidden">
                <img
                  src={artDialogItem.arteUrl}
                  alt="Arte del anuncio"
                  className="w-full object-contain max-h-72"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 rounded-md border bg-muted/30 text-muted-foreground gap-2">
                <ImageIcon className="w-8 h-8 opacity-40" />
                <p className="text-sm">No hay arte disponible para este anuncio</p>
              </div>
            )}

            {/* Upload controls */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline" size="sm" className="gap-1.5"
                onClick={() => arteInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                {artDialogItem?.arteUrl ? "Cambiar arte" : "Subir arte"}
              </Button>

              {pendingArteBase64 && (
                <>
                  <Button
                    size="sm"
                    className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white gap-1.5"
                    onClick={handleUploadArte}
                    disabled={uploadArte.isPending}
                  >
                    {uploadArte.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Guardar para este anuncio
                  </Button>

                  {sameClientAnuncioIds.length > 1 && (
                    <Button
                      size="sm" variant="outline"
                      className="gap-1.5 border-[#ff6b35] text-[#ff6b35] hover:bg-orange-50"
                      onClick={handleBulkUploadArte}
                      disabled={bulkUploadArte.isPending}
                    >
                      {bulkUploadArte.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                      Aplicar a {sameClientAnuncioIds.length} seleccionados de {artDialogItem?.cliente}
                    </Button>
                  )}
                </>
              )}
            </div>
            <input ref={arteInputRef} type="file" accept="image/*" className="hidden" onChange={handleArteFilePick} />
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Foto Instalación Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={!!fotoDialogItem}
        onOpenChange={() => {
          setFotoDialogItem(null);
          setPendingFotoUrl(null);
          setPendingFotoBase64(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Foto de Instalación — {fotoDialogItem?.cobertizoId}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Existing photo */}
            {fotoDialogItem?.fotoInstalacion && !pendingFotoUrl && (
              <div className="rounded-md border overflow-hidden">
                <img
                  src={fotoDialogItem.fotoInstalacion}
                  alt="Foto instalación"
                  className="w-full object-contain max-h-64"
                />
              </div>
            )}

            {/* Preview of new photo */}
            {pendingFotoUrl && (
              <div className="rounded-md border overflow-hidden relative">
                <img
                  src={pendingFotoUrl}
                  alt="Preview"
                  className="w-full object-contain max-h-64"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 bg-white/80 hover:bg-white"
                  onClick={() => {
                    setPendingFotoUrl(null);
                    setPendingFotoBase64(null);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Upload button */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fotoInputRef.current?.click()}
              >
                <Camera className="w-4 h-4" />
                {fotoDialogItem?.fotoInstalacion ? "Cambiar foto" : "Seleccionar foto"}
              </Button>
              {pendingFotoBase64 && (
                <Button
                  size="sm"
                  className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white gap-1.5"
                  onClick={handleUploadFoto}
                  disabled={uploadFoto.isPending}
                >
                  {uploadFoto.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Guardar foto
                </Button>
              )}
            </div>
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFotoFilePick}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Instalado Dialog ─────────────────────────────────────────── */}
      <AlertDialog open={!!confirmInstalado} onOpenChange={() => setConfirmInstalado(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como Instalado?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <span className="block text-sm">
                  El anuncio{" "}
                  <strong>
                    {confirmInstalado?.producto} — {confirmInstalado?.cobertizoId} (
                    {confirmInstalado?.orientacion})
                  </strong>{" "}
                  será marcado como <strong>Instalado</strong> y el estado en Gestor de Anuncios
                  cambiará automáticamente a <strong>Activo</strong>.
                </span>

                {/* Optional photo upload before confirming */}
                <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Foto de instalación (opcional)
                  </p>
                  {pendingFotoUrl ? (
                    <div className="relative">
                      <img
                        src={pendingFotoUrl}
                        alt="Preview"
                        className="w-full max-h-40 object-contain rounded"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5 bg-white/80"
                        onClick={() => {
                          setPendingFotoUrl(null);
                          setPendingFotoBase64(null);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-7"
                      onClick={() => fotoInputRef.current?.click()}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Agregar foto
                    </Button>
                  )}
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFotoFilePick}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFotoUrl(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white"
              onClick={handleConfirmInstalado}
              disabled={markInstalado.isPending}
            >
              {markInstalado.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Confirmar Instalado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
      </div>
    </div>
  );
}
