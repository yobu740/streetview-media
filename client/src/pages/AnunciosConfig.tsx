import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, Edit, ToggleLeft, ToggleRight, Megaphone, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

type AnnouncementType = "info" | "alerta" | "exito" | "urgente";

const typeConfig: Record<AnnouncementType, { label: string; color: string; icon: React.ReactNode }> = {
  info: { label: "Información", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <Info className="h-4 w-4" /> },
  alerta: { label: "Alerta", color: "bg-amber-100 text-amber-800 border-amber-200", icon: <AlertTriangle className="h-4 w-4" /> },
  exito: { label: "Éxito", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="h-4 w-4" /> },
  urgente: { label: "Urgente", color: "bg-red-100 text-red-800 border-red-200", icon: <Megaphone className="h-4 w-4" /> },
};

const emptyForm = {
  titulo: "",
  mensaje: "",
  tipo: "info" as AnnouncementType,
  activo: 1,
};

export default function AnunciosConfig() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  // AdminSidebar manages its own mobile state internally
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: announcements, isLoading } = trpc.announcements.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const createMutation = trpc.announcements.create.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
      utils.announcements.getActive.invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Anuncio creado correctamente");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.announcements.update.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
      utils.announcements.getActive.invalidate();
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success("Anuncio actualizado");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.announcements.toggleActive.useMutation({
    onSuccess: (data) => {
      utils.announcements.list.invalidate();
      utils.announcements.getActive.invalidate();
      toast.success(data.activo ? "Anuncio activado" : "Anuncio desactivado");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.announcements.delete.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
      utils.announcements.getActive.invalidate();
      setDeleteId(null);
      toast.success("Anuncio eliminado");
    },
    onError: (err) => toast.error(err.message),
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4d3c]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (ann: typeof announcements extends (infer T)[] | undefined ? T : never) => {
    if (!ann) return;
    setEditingId((ann as any).id);
    setForm({
      titulo: (ann as any).titulo,
      mensaje: (ann as any).mensaje,
      tipo: (ann as any).tipo as AnnouncementType,
      activo: (ann as any).activo,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.titulo.trim() || !form.mensaje.trim()) {
      toast.error("El título y mensaje son requeridos");
      return;
    }
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">

            <div>
              <h1 className="text-xl font-bold text-[#1a4d3c]">Anuncios del Sistema</h1>
              <p className="text-sm text-gray-500">Configura los mensajes toast que aparecen al entrar a la plataforma</p>
            </div>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Anuncio
          </Button>
        </div>

        <div className="p-6">
          {/* Info card */}
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">¿Cómo funciona?</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Solo un anuncio puede estar activo a la vez. El anuncio activo aparece como un toast flotante en la esquina inferior derecha cuando cualquier usuario entra a la plataforma. El usuario puede cerrarlo con el botón "×".
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Announcements list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#1a4d3c]" />
            </div>
          ) : !announcements || announcements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay anuncios configurados</p>
                <p className="text-sm text-gray-400 mt-1">Crea un anuncio para que aparezca en la plataforma</p>
                <Button onClick={handleOpenCreate} className="mt-4 bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer anuncio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {announcements.map((ann: any) => {
                const config = typeConfig[ann.tipo as AnnouncementType] || typeConfig.info;
                return (
                  <Card key={ann.id} className={`transition-all ${ann.activo ? "border-[#1a4d3c] shadow-sm" : "opacity-60"}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg border ${config.color} flex-shrink-0`}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-base">{ann.titulo}</CardTitle>
                              <Badge variant={ann.activo ? "default" : "secondary"} className={ann.activo ? "bg-[#1a4d3c]" : ""}>
                                {ann.activo ? "Activo" : "Inactivo"}
                              </Badge>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>
                                {config.label}
                              </span>
                            </div>
                            <CardDescription className="mt-1 line-clamp-2">{ann.mensaje}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleMutation.mutate({ id: ann.id })}
                            disabled={toggleMutation.isPending}
                            title={ann.activo ? "Desactivar" : "Activar"}
                          >
                            {ann.activo
                              ? <ToggleRight className="h-4 w-4 text-[#1a4d3c]" />
                              : <ToggleLeft className="h-4 w-4 text-gray-400" />
                            }
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(ann)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteId(ann.id)}
                            className="text-red-500 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-gray-400">
                        Creado por {ann.creadoPor} · {new Date(ann.createdAt).toLocaleDateString("es-PR", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Anuncio" : "Nuevo Anuncio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ej: Mantenimiento programado"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="mensaje">Mensaje *</Label>
              <Textarea
                id="mensaje"
                value={form.mensaje}
                onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                placeholder="Escribe el mensaje que verán los usuarios..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as AnnouncementType })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Información (azul)</SelectItem>
                  <SelectItem value="alerta">Alerta (ámbar)</SelectItem>
                  <SelectItem value="exito">Éxito (verde)</SelectItem>
                  <SelectItem value="urgente">Urgente (rojo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="activo"
                checked={form.activo === 1}
                onChange={(e) => setForm({ ...form, activo: e.target.checked ? 1 : 0 })}
                className="cursor-pointer"
              />
              <Label htmlFor="activo" className="cursor-pointer">Activar inmediatamente</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Guardar cambios" : "Crear anuncio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar anuncio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El anuncio dejará de mostrarse inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
