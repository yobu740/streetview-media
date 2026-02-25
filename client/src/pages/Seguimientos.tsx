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
import { trpc } from "@/lib/trpc";
import { formatDateDisplay } from "@/lib/dateUtils";
import { Loader2, Phone, Mail, Calendar, MessageSquare, CheckCircle, XCircle, Clock, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Seguimientos() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedSeguimiento, setSelectedSeguimiento] = useState<any>(null);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  
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
  
  // Queries
  const { data: seguimientos, isLoading } = trpc.seguimientos.myFollowUps.useQuery(undefined, { enabled: isAuthenticated });
  const { data: pending } = trpc.seguimientos.pending.useQuery(undefined, { enabled: isAuthenticated });
  const { data: notes } = trpc.seguimientos.getNotes.useQuery(
    { seguimientoId: selectedSeguimiento?.id || 0 },
    { enabled: !!selectedSeguimiento }
  );
  
  // Mutations
  const updateStatus = trpc.seguimientos.updateStatus.useMutation();
  const addNote = trpc.seguimientos.addNote.useMutation();
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
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const handleContact = async () => {
    if (!selectedSeguimiento) return;
    
    try {
      await updateStatus.mutateAsync({
        id: selectedSeguimiento.id,
        ...contactForm,
      });
      
      utils.seguimientos.myFollowUps.invalidate();
      utils.seguimientos.pending.invalidate();
      toast.success("Contacto registrado exitosamente");
      setIsContactDialogOpen(false);
      setContactForm({
        estado: "Contactado",
        fechaContacto: new Date().toISOString().split('T')[0],
        resultado: "",
        proximoSeguimiento: "",
      });
    } catch (error) {
      toast.error("Error al registrar contacto");
    }
  };
  
  const handleAddNote = async () => {
    if (!selectedSeguimiento || !noteForm.nota.trim()) return;
    
    try {
      await addNote.mutateAsync({
        seguimientoId: selectedSeguimiento.id,
        ...noteForm,
      });
      
      utils.seguimientos.getNotes.invalidate({ seguimientoId: selectedSeguimiento.id });
      toast.success("Nota agregada exitosamente");
      setNoteForm({ nota: "", tipoContacto: "Llamada" });
    } catch (error) {
      toast.error("Error al agregar nota");
    }
  };
  
  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      "Pendiente": { variant: "secondary", icon: Clock },
      "Contactado": { variant: "default", icon: Phone },
      "Interesado": { variant: "default", icon: CheckCircle },
      "Renovado": { variant: "default", icon: CheckCircle },
      "No Renovará": { variant: "destructive", icon: XCircle },
    };
    
    const config = variants[estado] || variants["Pendiente"];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {estado}
      </Badge>
    );
  };
  
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
          <div className="mb-8">
            <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Seguimientos de Clientes</h1>
            <p className="text-body text-lg text-[#2a2a2a]/60">
              Gestiona tus contactos y renovaciones de campañas
            </p>
          </div>
          
          {/* Statistics Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="border-2 border-[#1a4d3c]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#1a4d3c]">Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[#ff6b35]">
                  {pending?.filter(s => s.estado === "Pendiente").length || 0}
                </div>
                <p className="text-sm text-[#2a2a2a]/60 mt-1">Clientes por contactar</p>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-[#1a4d3c]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#1a4d3c]">Contactados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[#1a4d3c]">
                  {seguimientos?.filter(s => s.estado === "Contactado" || s.estado === "Interesado").length || 0}
                </div>
                <p className="text-sm text-[#2a2a2a]/60 mt-1">En proceso de seguimiento</p>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-[#1a4d3c]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#1a4d3c]">Renovados</CardTitle>
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
              <CardTitle className="text-2xl text-[#1a4d3c]">Mis Seguimientos</CardTitle>
              <CardDescription>Lista de clientes asignados para renovación</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1a4d3c]" />
                </div>
              ) : seguimientos && seguimientos.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Vence</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Último Contacto</TableHead>
                        <TableHead>Próximo Seguimiento</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seguimientos.map((seg) => (
                        <TableRow key={seg.id}>
                          <TableCell className="font-semibold">{seg.cliente}</TableCell>
                          <TableCell>{seg.producto || "-"}</TableCell>
                          <TableCell>{formatDateDisplay(seg.fechaVencimiento)}</TableCell>
                          <TableCell>{getEstadoBadge(seg.estado)}</TableCell>
                          <TableCell>
                            {seg.fechaContacto ? formatDateDisplay(seg.fechaContacto) : "-"}
                          </TableCell>
                          <TableCell>
                            {seg.proximoSeguimiento ? formatDateDisplay(seg.proximoSeguimiento) : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSeguimiento(seg);
                                  setIsContactDialogOpen(true);
                                }}
                              >
                                <Phone className="h-4 w-4 mr-1" />
                                Contactar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSeguimiento(seg);
                                  setIsNotesDialogOpen(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Notas
                              </Button>
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
                  <p className="text-lg">No tienes seguimientos asignados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Contacto</DialogTitle>
            <DialogDescription>
              Cliente: {selectedSeguimiento?.cliente} - {selectedSeguimiento?.producto}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Estado</Label>
              <Select 
                value={contactForm.estado} 
                onValueChange={(value: any) => setContactForm({...contactForm, estado: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Input 
                type="date" 
                value={contactForm.fechaContacto}
                onChange={(e) => setContactForm({...contactForm, fechaContacto: e.target.value})}
              />
            </div>
            
            <div>
              <Label>Resultado del Contacto</Label>
              <Textarea 
                placeholder="Describe el resultado de la conversación..."
                value={contactForm.resultado}
                onChange={(e) => setContactForm({...contactForm, resultado: e.target.value})}
                rows={3}
              />
            </div>
            
            <div>
              <Label>Próximo Seguimiento (Opcional)</Label>
              <Input 
                type="date" 
                value={contactForm.proximoSeguimiento}
                onChange={(e) => setContactForm({...contactForm, proximoSeguimiento: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleContact}
              disabled={updateStatus.isPending}
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a]"
            >
              {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Notes Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notas de Conversación</DialogTitle>
            <DialogDescription>
              Cliente: {selectedSeguimiento?.cliente} - {selectedSeguimiento?.producto}
            </DialogDescription>
          </DialogHeader>
          
          {/* Add Note Form */}
          <div className="space-y-4 border-b pb-4">
            <div>
              <Label>Tipo de Contacto</Label>
              <Select 
                value={noteForm.tipoContacto} 
                onValueChange={(value: any) => setNoteForm({...noteForm, tipoContacto: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Textarea 
                placeholder="Escribe los detalles de la conversación..."
                value={noteForm.nota}
                onChange={(e) => setNoteForm({...noteForm, nota: e.target.value})}
                rows={4}
              />
            </div>
            
            <Button 
              onClick={handleAddNote}
              disabled={addNote.isPending || !noteForm.nota.trim()}
              className="w-full bg-[#ff6b35] hover:bg-[#e65a25]"
            >
              {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Agregar Nota
            </Button>
          </div>
          
          {/* Notes List */}
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
                          {formatDateDisplay(note.createdAt)} - {note.tipoContacto}
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
            <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
