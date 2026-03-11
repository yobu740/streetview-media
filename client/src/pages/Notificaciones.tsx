import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Bell, Clock, AlertTriangle, CheckCheck, Eye } from "lucide-react";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

export default function Notificaciones() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // --- Reservas Pendientes ---
  const { data: pendingAnuncios, refetch: refetchPending } = trpc.approvals.pending.useQuery(undefined, { enabled: isAdmin });
  const approveMutation = trpc.approvals.approve.useMutation({
    onSuccess: () => { toast.success("Reserva aprobada"); refetchPending(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.approvals.reject.useMutation({
    onSuccess: () => { toast.success("Reserva rechazada"); refetchPending(); },
    onError: (e) => toast.error(e.message),
  });

  // Bulk approve/reject
  const [selectedPending, setSelectedPending] = useState<Set<number>>(new Set());
  const bulkApproveMutation = trpc.approvals.bulkApprove.useMutation({
    onSuccess: (r) => { toast.success(`${r.count} reservas aprobadas`); setSelectedPending(new Set()); refetchPending(); },
    onError: (e) => toast.error(e.message),
  });
  const togglePending = (id: number) => {
    setSelectedPending(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllPending = () => {
    if (!pendingAnuncios) return;
    if (selectedPending.size === pendingAnuncios.length) setSelectedPending(new Set());
    else setSelectedPending(new Set(pendingAnuncios.map((a: any) => a.id)));
  };

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // --- Anuncios por Vencer ---
  const { data: expiringAnuncios, refetch: refetchExpiring } = trpc.notifications.expiringAnuncios.useQuery(undefined, { enabled: isAdmin });
  const createSeguimientoMutation = trpc.notifications.createSeguimiento.useMutation({
    onSuccess: () => { toast.success("Seguimiento creado"); refetchExpiring(); },
    onError: (e) => toast.error(e.message),
  });

  // --- System Notifications ---
  const { data: sysNotifications, refetch: refetchSys } = trpc.notifications.list.useQuery();
  const markReadMutation = trpc.notifications.markAsRead.useMutation({ onSuccess: () => refetchSys() });
  const markAllReadMutation = trpc.notifications.markAllAsRead.useMutation({ onSuccess: () => { toast.success("Todas marcadas como leídas"); refetchSys(); } });
  const ignoreNotifMutation = trpc.notifications.ignore.useMutation({ onSuccess: () => refetchSys() });

  const unreadSys = sysNotifications?.filter((n: any) => !n.read && !n.ignored).length || 0;
  const pendingCount = pendingAnuncios?.length || 0;
  const expiringCount = expiringAnuncios?.filter((a: any) => !a.hasSeguimiento).length || 0;

  const getNotifIcon = (type: string) => {
    if (type === "reservation_approved") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (type === "reservation_rejected") return <XCircle className="h-4 w-4 text-red-600" />;
    if (type === "campaign_ending") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    return <Bell className="h-4 w-4 text-blue-600" />;
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Notificaciones</h1>
            <p className="text-body text-gray-600">Centro de alertas, reservas pendientes y anuncios por vencer</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-amber-500">
              <p className="text-sm text-gray-500 mb-1">Reservas Pendientes</p>
              <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-orange-500">
              <p className="text-sm text-gray-500 mb-1">Anuncios por Vencer</p>
              <p className="text-3xl font-bold text-orange-600">{expiringCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
              <p className="text-sm text-gray-500 mb-1">Notificaciones sin leer</p>
              <p className="text-3xl font-bold text-blue-600">{unreadSys}</p>
            </div>
          </div>

          <Tabs defaultValue="reservas">
            <TabsList className="mb-4">
              <TabsTrigger value="reservas" className="relative">
                Reservas Pendientes
                {pendingCount > 0 && <Badge className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0">{pendingCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="vencer">
                Por Vencer
                {expiringCount > 0 && <Badge className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0">{expiringCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="sistema">
                Sistema
                {unreadSys > 0 && <Badge className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0">{unreadSys}</Badge>}
              </TabsTrigger>
            </TabsList>

            {/* ---- TAB: Reservas Pendientes ---- */}
            <TabsContent value="reservas">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {selectedPending.size > 0 && (
                  <div className="bg-[#1a4d3c] text-white px-4 py-3 flex items-center gap-3">
                    <span className="text-sm font-semibold">{selectedPending.size} seleccionada{selectedPending.size > 1 ? "s" : ""}</span>
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700"
                        onClick={() => bulkApproveMutation.mutate({ anuncioIds: Array.from(selectedPending) })}
                        disabled={bulkApproveMutation.isPending}
                      >
                        <CheckCheck className="h-4 w-4 mr-1" /> Aprobar todas
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => setSelectedPending(new Set())}>Cancelar</Button>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input type="checkbox"
                            checked={pendingAnuncios ? selectedPending.size === pendingAnuncios.length && pendingAnuncios.length > 0 : false}
                            onChange={toggleAllPending}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Parada</TableHead>
                        <TableHead>Orientación</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Creado por</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingAnuncios && pendingAnuncios.length > 0 ? (
                        pendingAnuncios.map((a: any) => (
                          <TableRow key={a.id} className={selectedPending.has(a.id) ? "bg-green-50" : ""}>
                            <TableCell>
                              <input type="checkbox" checked={selectedPending.has(a.id)} onChange={() => togglePending(a.id)} className="rounded" />
                            </TableCell>
                            <TableCell className="font-medium">{a.cliente}</TableCell>
                            <TableCell>{a.producto || "—"}</TableCell>
                            <TableCell>{a.cobertizoId || a.paradaId}</TableCell>
                            <TableCell>{a.orientacion || "—"}</TableCell>
                            <TableCell>{a.fechaInicio ? new Date(a.fechaInicio).toLocaleDateString("es-PR") : "—"}</TableCell>
                            <TableCell>{a.fechaFin ? new Date(a.fechaFin).toLocaleDateString("es-PR") : "—"}</TableCell>
                            <TableCell className="text-sm text-gray-500">{a.createdByName || "—"}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => approveMutation.mutate({ anuncioId: a.id })}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                                  onClick={() => { setRejectTarget(a.id); setRejectReason(""); }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-gray-500 py-12">
                            <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-2" />
                            No hay reservas pendientes de aprobación
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* ---- TAB: Anuncios por Vencer ---- */}
            <TabsContent value="vencer">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Parada</TableHead>
                        <TableHead>Orientación</TableHead>
                        <TableHead>Vence</TableHead>
                        <TableHead>Días restantes</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiringAnuncios && expiringAnuncios.length > 0 ? (
                        expiringAnuncios.map((a: any) => {
                          const daysLeft = Math.ceil((new Date(a.fechaFin).getTime() - Date.now()) / 86400000);
                          const urgency = daysLeft <= 2 ? "text-red-600 font-bold" : daysLeft <= 5 ? "text-orange-600 font-semibold" : "text-amber-600";
                          return (
                            <TableRow key={a.id} className={a.hasSeguimiento ? "opacity-60 bg-gray-50" : ""}>
                              <TableCell className="font-medium">{a.cliente}</TableCell>
                              <TableCell>{a.producto || "—"}</TableCell>
                              <TableCell>{a.cobertizoId || a.paradaId}</TableCell>
                              <TableCell>{a.orientacion || "—"}</TableCell>
                              <TableCell>{new Date(a.fechaFin).toLocaleDateString("es-PR")}</TableCell>
                              <TableCell><span className={urgency}>{daysLeft}d</span></TableCell>
                              <TableCell>
                                {a.hasSeguimiento ? (
                                  <Badge variant="outline" className="text-green-600 border-green-400">En seguimiento</Badge>
                                ) : (
                                  <Button size="sm" className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white"
                                    onClick={() => createSeguimientoMutation.mutate({
                                      notificationId: a.notificationId || 0,
                                      anuncioId: a.id,
                                      cliente: a.cliente,
                                      producto: a.producto || "",
                                      fechaVencimiento: a.fechaFin,
                                    })}
                                    disabled={createSeguimientoMutation.isPending}
                                  >
                                    Dar Seguimiento
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                            <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            No hay anuncios próximos a vencer
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* ---- TAB: Sistema ---- */}
            <TabsContent value="sistema">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <p className="text-sm text-gray-600">{unreadSys} sin leer</p>
                  {unreadSys > 0 && (
                    <Button size="sm" variant="outline" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
                      <CheckCheck className="h-4 w-4 mr-1" /> Marcar todas como leídas
                    </Button>
                  )}
                </div>
                <div className="divide-y">
                  {sysNotifications && sysNotifications.length > 0 ? (
                    sysNotifications.filter((n: any) => !n.ignored).map((n: any) => (
                      <div key={n.id} className={`flex items-start gap-3 px-4 py-4 ${!n.read ? "bg-blue-50" : ""}`}>
                        <div className="mt-0.5">{getNotifIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${!n.read ? "text-gray-900" : "text-gray-600"}`}>{n.title}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString("es-PR")}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {!n.read && (
                            <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-100 h-7 px-2"
                              onClick={() => markReadMutation.mutate({ id: n.id })}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-gray-400 hover:bg-gray-100 h-7 px-2"
                            onClick={() => ignoreNotifMutation.mutate({ id: n.id })}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-12">
                      <Bell className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      No hay notificaciones
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectTarget !== null} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" /> Rechazar Reserva
            </DialogTitle>
            <DialogDescription>Opcional: indica el motivo del rechazo.</DialogDescription>
          </DialogHeader>
          <textarea
            className="w-full border rounded-md p-2 text-sm min-h-[80px] resize-none"
            placeholder="Motivo del rechazo (opcional)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (rejectTarget !== null) {
                  rejectMutation.mutate({ anuncioId: rejectTarget });
                  setRejectTarget(null);
                }
              }}
              disabled={rejectMutation.isPending}
            >
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
