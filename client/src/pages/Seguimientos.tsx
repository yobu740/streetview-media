import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { formatDateDisplay } from "@/lib/dateUtils";
import {
  Loader2, Phone, Mail, Calendar, MessageSquare, CheckCircle, XCircle, Clock,
  Plus, UserPlus, Trash2, Archive, UserCheck, Pencil, ArchiveRestore
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Seguimientos() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedSeguimiento, setSelectedSeguimiento] = useState<any>(null);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [isContactInfoDialogOpen, setIsContactInfoDialogOpen] = useState(false);
  const [isAssignVendorDialogOpen, setIsAssignVendorDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    estado: "Contactado" as const,
    fechaContacto: new Date().toISOString().split('T')[0],
    resultado: "",
    proximoSeguimiento: "",
  });

  // Note form state
  const [noteForm, setNoteForm] = useState({
    nota: "",
    tipoContacto: "Llamada" as const,
  });

  // Add client form state
  const [addClientForm, setAddClientForm] = useState({
    cliente: "",
    producto: "",
    telefono: "",
    email: "",
    vendedorId: "",
    fechaVencimiento: "",
  });

  // Contact info form state
  const [contactInfoForm, setContactInfoForm] = useState({
    telefono: "",
    email: "",
  });

  // Assign vendor state
  const [assignVendorId, setAssignVendorId] = useState("");

  // Queries
  const { data: seguimientos, isLoading } = trpc.seguimientos.listAll.useQuery(undefined, { enabled: isAuthenticated });
  const { data: archivedSeguimientos, isLoading: isLoadingArchived } = trpc.seguimientos.archived.useQuery(undefined, { enabled: isAuthenticated && showArchived });
  const { data: pending } = trpc.seguimientos.pending.useQuery(undefined, { enabled: isAuthenticated });
  const { data: vendors } = trpc.seguimientos.listVendors.useQuery(undefined, { enabled: isAuthenticated });
  const { data: notes } = trpc.seguimientos.getNotes.useQuery(
    { seguimientoId: selectedSeguimiento?.id || 0 },
    { enabled: !!selectedSeguimiento && isNotesDialogOpen }
  );

  // Mutations
  const updateStatus = trpc.seguimientos.updateStatus.useMutation();
  const addNote = trpc.seguimientos.addNote.useMutation();
  const createManual = trpc.seguimientos.createManual.useMutation();
  const updateContact = trpc.seguimientos.updateContact.useMutation();
  const assignVendor = trpc.seguimientos.assignVendor.useMutation();
  const deleteSeguimiento = trpc.seguimientos.deleteSeguimiento.useMutation();
  const archiveSeguimiento = trpc.seguimientos.archiveSeguimiento.useMutation();
  const utils = trpc.useUtils();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4d3c]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#1a4d3c] to-[#0f3a2a]">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-lg shadow-2xl p-8 border-4 border-[#ff6b35]">
            <div className="text-center mb-8">
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png"
                alt="Streetview Media"
                className="h-16 mx-auto mb-4"
              />
              <h1 className="text-display text-3xl text-[#1a4d3c] mb-2">Seguimientos</h1>
              <p className="text-body text-[#2a2a2a]/60">Inicia sesión para acceder</p>
            </div>
            <div className="space-y-6">
              <Button asChild className="w-full h-12 bg-white hover:bg-gray-50 text-[#2a2a2a] border-2 border-gray-300 hover:border-[#ff6b35] transition-all shadow-md hover:shadow-lg">
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleContact = async () => {
    if (!selectedSeguimiento) return;
    try {
      await updateStatus.mutateAsync({ id: selectedSeguimiento.id, ...contactForm });
      utils.seguimientos.listAll.invalidate();
      utils.seguimientos.pending.invalidate();
      toast.success("Contacto registrado exitosamente");
      setIsContactDialogOpen(false);
      setContactForm({ estado: "Contactado", fechaContacto: new Date().toISOString().split('T')[0], resultado: "", proximoSeguimiento: "" });
    } catch {
      toast.error("Error al registrar contacto");
    }
  };

  const handleAddNote = async () => {
    if (!selectedSeguimiento || !noteForm.nota.trim()) return;
    try {
      await addNote.mutateAsync({ seguimientoId: selectedSeguimiento.id, ...noteForm });
      utils.seguimientos.getNotes.invalidate({ seguimientoId: selectedSeguimiento.id });
      toast.success("Nota agregada exitosamente");
      setNoteForm({ nota: "", tipoContacto: "Llamada" });
    } catch {
      toast.error("Error al agregar nota");
    }
  };

  const handleAddClient = async () => {
    if (!addClientForm.cliente.trim()) return;
    try {
      await createManual.mutateAsync({
        cliente: addClientForm.cliente,
        producto: addClientForm.producto || undefined,
        telefono: addClientForm.telefono || undefined,
        email: addClientForm.email || undefined,
        vendedorId: addClientForm.vendedorId ? parseInt(addClientForm.vendedorId) : undefined,
        fechaVencimiento: addClientForm.fechaVencimiento || undefined,
      });
      utils.seguimientos.listAll.invalidate();
      utils.seguimientos.pending.invalidate();
      toast.success("Cliente agregado exitosamente");
      setIsAddClientDialogOpen(false);
      setAddClientForm({ cliente: "", producto: "", telefono: "", email: "", vendedorId: "", fechaVencimiento: "" });
    } catch {
      toast.error("Error al agregar cliente");
    }
  };

  const handleUpdateContact = async () => {
    if (!selectedSeguimiento) return;
    try {
      await updateContact.mutateAsync({
        id: selectedSeguimiento.id,
        telefono: contactInfoForm.telefono || undefined,
        email: contactInfoForm.email || undefined,
      });
      utils.seguimientos.listAll.invalidate();
      toast.success("Información de contacto actualizada");
      setIsContactInfoDialogOpen(false);
    } catch {
      toast.error("Error al actualizar contacto");
    }
  };

  const handleAssignVendor = async () => {
    if (!selectedSeguimiento || !assignVendorId) return;
    try {
      await assignVendor.mutateAsync({ id: selectedSeguimiento.id, vendedorId: parseInt(assignVendorId) });
      utils.seguimientos.listAll.invalidate();
      toast.success("Vendedor asignado exitosamente");
      setIsAssignVendorDialogOpen(false);
      setAssignVendorId("");
    } catch {
      toast.error("Error al asignar vendedor");
    }
  };

  const handleDelete = async () => {
    if (!selectedSeguimiento) return;
    try {
      await deleteSeguimiento.mutateAsync({ id: selectedSeguimiento.id });
      utils.seguimientos.listAll.invalidate();
      utils.seguimientos.pending.invalidate();
      toast.success("Seguimiento eliminado");
      setIsDeleteConfirmOpen(false);
      setSelectedSeguimiento(null);
    } catch {
      toast.error("Error al eliminar seguimiento");
    }
  };

  const handleArchive = async (seg: any) => {
    try {
      await archiveSeguimiento.mutateAsync({ id: seg.id });
      utils.seguimientos.listAll.invalidate();
      utils.seguimientos.archived.invalidate();
      utils.seguimientos.pending.invalidate();
      toast.success("Seguimiento archivado");
    } catch {
      toast.error("Error al archivar seguimiento");
    }
  };

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      "Pendiente": { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
      "Contactado": { color: "bg-blue-100 text-blue-800 border-blue-300", icon: Phone },
      "Interesado": { color: "bg-purple-100 text-purple-800 border-purple-300", icon: CheckCircle },
      "Renovado": { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle },
      "No Renovará": { color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
    };
    const c = config[estado] || config["Pendiente"];
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>
        <Icon className="h-3 w-3" />
        {estado}
      </span>
    );
  };

  const getVendorName = (vendedorId: number) => {
    const v = vendors?.find(v => v.id === vendedorId);
    return v?.name || `ID ${vendedorId}`;
  };

  const displayList = showArchived ? (archivedSeguimientos || []) : (seguimientos || []);
  const isLoadingList = showArchived ? isLoadingArchived : isLoading;

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <AdminSidebar
        pendingReservationsCount={0}
        unreadCount={0}
        onExportExcel={() => {}}
        onPrintReport={() => {}}
      />

      <div className="flex-1 min-w-0">
        <div className="container py-8">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Seguimientos de Clientes</h1>
              <p className="text-body text-lg text-[#2a2a2a]/60">
                Gestiona tus contactos y renovaciones de campañas
              </p>
            </div>
            <Button
              onClick={() => setIsAddClientDialogOpen(true)}
              className="bg-[#ff6b35] hover:bg-[#e65a25] text-white flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Añadir Cliente
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="border-2 border-[#1a4d3c]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#1a4d3c]">Total Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[#1a4d3c]">{seguimientos?.length || 0}</div>
                <p className="text-sm text-[#2a2a2a]/60 mt-1">Seguimientos activos</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-yellow-400">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-yellow-700">Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[#ff6b35]">
                  {seguimientos?.filter(s => s.estado === "Pendiente").length || 0}
                </div>
                <p className="text-sm text-[#2a2a2a]/60 mt-1">Clientes por contactar</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-blue-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-blue-700">En Proceso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-blue-600">
                  {seguimientos?.filter(s => s.estado === "Contactado" || s.estado === "Interesado").length || 0}
                </div>
                <p className="text-sm text-[#2a2a2a]/60 mt-1">En seguimiento activo</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-green-400">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-700">Renovados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">
                  {seguimientos?.filter(s => s.estado === "Renovado").length || 0}
                </div>
                <p className="text-sm text-[#2a2a2a]/60 mt-1">Campañas renovadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Follow-ups Table */}
          <Card className="border-2 border-[#1a4d3c]">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-2xl text-[#1a4d3c]">
                    {showArchived ? "Seguimientos Archivados" : "Seguimientos Activos"}
                  </CardTitle>
                  <CardDescription>
                    {showArchived ? "Historial de seguimientos archivados" : "Lista de clientes para seguimiento y renovación"}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-2"
                >
                  {showArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  {showArchived ? "Ver Activos" : "Ver Archivados"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingList ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1a4d3c]" />
                </div>
              ) : displayList.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Vence</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Próx. Seguimiento</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayList.map((seg) => (
                        <TableRow key={seg.id} className="hover:bg-[#f5f5f5]">
                          <TableCell className="font-semibold">{seg.cliente}</TableCell>
                          <TableCell>{seg.producto || "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5 text-xs text-[#2a2a2a]/70">
                              {seg.telefono ? (
                                <a href={`tel:${seg.telefono}`} className="flex items-center gap-1 hover:text-[#ff6b35]">
                                  <Phone className="h-3 w-3" /> {seg.telefono}
                                </a>
                              ) : null}
                              {seg.email ? (
                                <a href={`mailto:${seg.email}`} className="flex items-center gap-1 hover:text-[#ff6b35]">
                                  <Mail className="h-3 w-3" /> {seg.email}
                                </a>
                              ) : null}
                              {!seg.telefono && !seg.email && (
                                <span className="text-[#2a2a2a]/40 italic">Sin contacto</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-[#2a2a2a]/70">{getVendorName(seg.vendedorId)}</TableCell>
                          <TableCell>{formatDateDisplay(seg.fechaVencimiento)}</TableCell>
                          <TableCell>{getEstadoBadge(seg.estado)}</TableCell>
                          <TableCell>
                            {seg.proximoSeguimiento ? formatDateDisplay(seg.proximoSeguimiento) : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {/* Contactar */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                                    onClick={() => { setSelectedSeguimiento(seg); setIsContactDialogOpen(true); }}>
                                    <Phone className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Registrar Contacto</TooltipContent>
                              </Tooltip>

                              {/* Notas */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                                    onClick={() => { setSelectedSeguimiento(seg); setIsNotesDialogOpen(true); }}>
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Notas</TooltipContent>
                              </Tooltip>

                              {/* Editar contacto */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setSelectedSeguimiento(seg);
                                      setContactInfoForm({ telefono: seg.telefono || "", email: seg.email || "" });
                                      setIsContactInfoDialogOpen(true);
                                    }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar Teléfono/Email</TooltipContent>
                              </Tooltip>

                              {/* Asignar vendedor */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setSelectedSeguimiento(seg);
                                      setAssignVendorId(String(seg.vendedorId));
                                      setIsAssignVendorDialogOpen(true);
                                    }}>
                                    <UserCheck className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Asignar a Vendedor</TooltipContent>
                              </Tooltip>

                              {/* Archivar */}
                              {!showArchived && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
                                      onClick={() => handleArchive(seg)}
                                      disabled={archiveSeguimiento.isPending}>
                                      <Archive className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Archivar</TooltipContent>
                                </Tooltip>
                              )}

                              {/* Borrar */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                    onClick={() => { setSelectedSeguimiento(seg); setIsDeleteConfirmOpen(true); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-[#2a2a2a]/60">
                  <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">
                    {showArchived ? "No hay seguimientos archivados" : "No hay seguimientos activos"}
                  </p>
                  {!showArchived && (
                    <Button className="mt-4 bg-[#ff6b35] hover:bg-[#e65a25]" onClick={() => setIsAddClientDialogOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" /> Añadir primer cliente
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Add Client Dialog ─── */}
      <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1a4d3c]">Añadir Cliente</DialogTitle>
            <DialogDescription>Crea un nuevo seguimiento manualmente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del Cliente <span className="text-red-500">*</span></Label>
              <Input placeholder="Ej: Juan Pérez / Empresa XYZ"
                value={addClientForm.cliente}
                onChange={(e) => setAddClientForm({ ...addClientForm, cliente: e.target.value })} />
            </div>
            <div>
              <Label>Producto / Campaña</Label>
              <Input placeholder="Ej: Parada Ave. Ashford"
                value={addClientForm.producto}
                onChange={(e) => setAddClientForm({ ...addClientForm, producto: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Teléfono</Label>
                <Input placeholder="787-000-0000"
                  value={addClientForm.telefono}
                  onChange={(e) => setAddClientForm({ ...addClientForm, telefono: e.target.value })} />
              </div>
              <div>
                <Label>Correo Electrónico</Label>
                <Input type="email" placeholder="cliente@email.com"
                  value={addClientForm.email}
                  onChange={(e) => setAddClientForm({ ...addClientForm, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vendedor (Opcional)</Label>
                <Select value={addClientForm.vendedorId} onValueChange={(v) => setAddClientForm({ ...addClientForm, vendedorId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Asignar a..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors?.map(v => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha Límite (Opcional)</Label>
                <Input type="date"
                  value={addClientForm.fechaVencimiento}
                  onChange={(e) => setAddClientForm({ ...addClientForm, fechaVencimiento: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddClientDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddClient} disabled={createManual.isPending || !addClientForm.cliente.trim()}
              className="bg-[#ff6b35] hover:bg-[#e65a25]">
              {createManual.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Añadir Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Contact Info Dialog ─── */}
      <Dialog open={isContactInfoDialogOpen} onOpenChange={setIsContactInfoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1a4d3c]">Editar Información de Contacto</DialogTitle>
            <DialogDescription>Cliente: {selectedSeguimiento?.cliente}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Teléfono</Label>
              <Input placeholder="787-000-0000"
                value={contactInfoForm.telefono}
                onChange={(e) => setContactInfoForm({ ...contactInfoForm, telefono: e.target.value })} />
            </div>
            <div>
              <Label>Correo Electrónico</Label>
              <Input type="email" placeholder="cliente@email.com"
                value={contactInfoForm.email}
                onChange={(e) => setContactInfoForm({ ...contactInfoForm, email: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactInfoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateContact} disabled={updateContact.isPending}
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a]">
              {updateContact.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Assign Vendor Dialog ─── */}
      <Dialog open={isAssignVendorDialogOpen} onOpenChange={setIsAssignVendorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1a4d3c]">Asignar a Vendedor</DialogTitle>
            <DialogDescription>Cliente: {selectedSeguimiento?.cliente}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendedor</Label>
              <Select value={assignVendorId} onValueChange={setAssignVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vendedor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map(v => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.name} {v.role === "admin" ? "(Admin)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignVendorDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssignVendor} disabled={assignVendor.isPending || !assignVendorId}
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a]">
              {assignVendor.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm Dialog ─── */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Eliminar Seguimiento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el seguimiento de <strong>{selectedSeguimiento?.cliente}</strong>? Esta acción no se puede deshacer y eliminará también todas las notas asociadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleDelete} disabled={deleteSeguimiento.isPending}
              className="bg-red-600 hover:bg-red-700 text-white">
              {deleteSeguimiento.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Contact Dialog ─── */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Contacto</DialogTitle>
            <DialogDescription>
              Cliente: {selectedSeguimiento?.cliente} — {selectedSeguimiento?.producto}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Estado</Label>
              <Select value={contactForm.estado} onValueChange={(value: any) => setContactForm({ ...contactForm, estado: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contactado">Contactado</SelectItem>
                  <SelectItem value="Interesado">Interesado</SelectItem>
                  <SelectItem value="Renovado">Renovado</SelectItem>
                  <SelectItem value="No Renovará">No Renovará</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de Contacto</Label>
              <Input type="date" value={contactForm.fechaContacto}
                onChange={(e) => setContactForm({ ...contactForm, fechaContacto: e.target.value })} />
            </div>
            <div>
              <Label>Resultado del Contacto</Label>
              <Textarea placeholder="Describe el resultado de la conversación..."
                value={contactForm.resultado}
                onChange={(e) => setContactForm({ ...contactForm, resultado: e.target.value })}
                rows={3} />
            </div>
            <div>
              <Label>Próximo Seguimiento (Opcional)</Label>
              <Input type="date" value={contactForm.proximoSeguimiento}
                onChange={(e) => setContactForm({ ...contactForm, proximoSeguimiento: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleContact} disabled={updateStatus.isPending} className="bg-[#1a4d3c] hover:bg-[#0f3a2a]">
              {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Notes Dialog ─── */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notas de Conversación</DialogTitle>
            <DialogDescription>
              Cliente: {selectedSeguimiento?.cliente} — {selectedSeguimiento?.producto}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 border-b pb-4">
            <div>
              <Label>Tipo de Contacto</Label>
              <Select value={noteForm.tipoContacto} onValueChange={(value: any) => setNoteForm({ ...noteForm, tipoContacto: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Llamada">Llamada</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Reunión">Reunión</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nota</Label>
              <Textarea placeholder="Escribe los detalles de la conversación..."
                value={noteForm.nota}
                onChange={(e) => setNoteForm({ ...noteForm, nota: e.target.value })}
                rows={4} />
            </div>
            <Button onClick={handleAddNote} disabled={addNote.isPending || !noteForm.nota.trim()}
              className="w-full bg-[#ff6b35] hover:bg-[#e65a25]">
              {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Agregar Nota
            </Button>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Historial de Notas</h3>
            {notes && notes.length > 0 ? (
              notes.map((note) => (
                <Card key={note.id} className="border-l-4 border-[#1a4d3c]">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-sm font-semibold">{note.vendedorNombre}</CardTitle>
                        <CardDescription className="text-xs">
                          {formatDateDisplay(note.createdAt)} — {note.tipoContacto}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{note.tipoContacto}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{note.nota}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-[#2a2a2a]/60">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No hay notas registradas</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
