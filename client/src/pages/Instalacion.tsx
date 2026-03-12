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
} from "lucide-react";
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
  const handleFotoFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // Extract base64
      const base64 = dataUrl.split(",")[1];
      setPendingFotoBase64(base64);
      setPendingFotoMime(file.type || "image/jpeg");
      setPendingFotoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
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
        (item) => `
      <tr>
        <td>${item.flowCat ?? "—"}</td>
        <td>${item.cobertizoId}</td>
        <td>${item.orientacion}</td>
        <td>${item.direccion}</td>
        <td>${item.producto}</td>
        <td>${item.cliente}</td>
        <td>${item.tipo}</td>
        <td>${formatDate(item.fechaInicio)}</td>
        <td>${formatDate(item.fechaFin)}</td>
        <td>${item.estado}</td>
      </tr>`
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orden de Instalación</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
          h1 { color: #1a4d3c; font-size: 18px; margin-bottom: 4px; }
          p.sub { color: #666; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1a4d3c; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
          td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #f9fafb; }
          @media print { body { margin: 10px; } }
        </style>
      </head>
      <body>
        <h1>Orden de Instalación</h1>
        <p class="sub">Generada: ${new Date().toLocaleDateString("es-PR")} · ${items.length} anuncio(s)</p>
        <table>
          <thead>
            <tr>
              <th>Flowcat</th><th>Cobertizo</th><th>Orient.</th><th>Dirección</th>
              <th>Producto</th><th>Cliente</th><th>Tipo</th>
              <th>F. Inicio</th><th>F. Fin</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
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

      {/* ─── Art Preview Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!artDialogItem} onOpenChange={() => setArtDialogItem(null)}>
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
              {artDialogItem?.cliente}
            </div>
            {artDialogItem?.notas ? (
              <div className="rounded-md border overflow-hidden">
                <img
                  src={artDialogItem.notas}
                  alt="Arte del anuncio"
                  className="w-full object-contain max-h-80"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 rounded-md border bg-muted/30 text-muted-foreground gap-2">
                <ImageIcon className="w-8 h-8 opacity-40" />
                <p className="text-sm">No hay arte disponible para este anuncio</p>
              </div>
            )}
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
