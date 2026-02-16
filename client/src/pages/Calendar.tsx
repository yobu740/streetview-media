import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Loader2, Menu } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Calendar() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isReservaDialogOpen, setIsReservaDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [reservaForm, setReservaForm] = useState({
    producto: "",
    cliente: "",
    fechaInicio: "",
    fechaFin: "",
    tipo: "Fijo" as "Fijo" | "Bonificación",
    costoPorUnidad: "",
    selectionMode: "paradas" as "paradas" | "rutas",
    selectedParadas: [] as number[],
    selectedRutas: [] as string[],
  });
  const [paradaSearchTerm, setParadaSearchTerm] = useState("");
  
  const { data: paradas } = trpc.paradas.list.useQuery();
  const { data: anuncios } = trpc.anuncios.list.useQuery();
  const createAnuncio = trpc.anuncios.create.useMutation();
  const utils = trpc.useUtils();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4d3c]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  // Calendar logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  
  // Get anuncios for current month
  const getAnunciosForDate = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = date.toDateString();
    
    return anuncios?.filter(anuncio => {
      const inicio = new Date(anuncio.fechaInicio);
      const fin = new Date(anuncio.fechaFin);
      return date >= inicio && date <= fin && (anuncio.estado === "Activo" || anuncio.estado === "Programado");
    }) || [];
  };
  
  // Get paradas for selected date
  const getParadasForSelectedDate = () => {
    if (!selectedDate || !anuncios || !paradas) return [];
    
    const activeAnuncios = anuncios.filter(anuncio => {
      const inicio = new Date(anuncio.fechaInicio);
      const fin = new Date(anuncio.fechaFin);
      return selectedDate >= inicio && selectedDate <= fin && (anuncio.estado === "Activo" || anuncio.estado === "Programado");
    });
    
    return activeAnuncios.map(anuncio => {
      const parada = paradas.find(p => p.id === anuncio.paradaId);
      return { parada, anuncio };
    }).filter(item => item.parada);
  };
  
  const handleDateClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
  };
  
  // Get all paradas with availability information for selected date range
  const getAvailableParadas = () => {
    if (!reservaForm.fechaInicio || !reservaForm.fechaFin || !paradas || !anuncios) {
      return [];
    }
    
    const inicio = new Date(reservaForm.fechaInicio);
    const fin = new Date(reservaForm.fechaFin);
    
    return paradas
      .map(parada => {
        // Find conflicting anuncios for this parada
        const conflictingAnuncios = anuncios.filter(anuncio => {
          if (anuncio.paradaId !== parada.id || (anuncio.estado !== "Activo" && anuncio.estado !== "Programado")) return false;
          
          const anuncioInicio = new Date(anuncio.fechaInicio);
          const anuncioFin = new Date(anuncio.fechaFin);
          
          // Check if date ranges overlap
          return !(fin < anuncioInicio || inicio > anuncioFin);
        });
        
        const hasConflict = conflictingAnuncios.length > 0;
        
        // Find the next available date (end date of the latest conflicting anuncio)
        let availableAfter = null;
        if (hasConflict) {
          const latestAnuncio = conflictingAnuncios.reduce((latest, current) => {
            const currentEnd = new Date(current.fechaFin);
            const latestEnd = new Date(latest.fechaFin);
            return currentEnd > latestEnd ? current : latest;
          });
          availableAfter = new Date(latestAnuncio.fechaFin);
          availableAfter.setDate(availableAfter.getDate() + 1); // Available day after the anuncio ends
        }
        
        return {
          ...parada,
          isAvailable: !hasConflict,
          availableAfter,
        };
      })
      .filter(parada => {
        // Filter by search term if provided
        if (!paradaSearchTerm) return true;
        
        const searchLower = paradaSearchTerm.toLowerCase().trim();
        // Support comma-separated IDs
        if (searchLower.includes(',')) {
          const ids = searchLower.split(',').map(id => id.trim());
          return ids.some(id => parada.cobertizoId.toLowerCase().includes(id));
        }
        // Single ID search
        return parada.cobertizoId.toLowerCase().includes(searchLower) ||
               parada.localizacion.toLowerCase().includes(searchLower);
      });
  };
  
  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Calculate statistics for current month
  const totalParadas = paradas?.length || 0;
  const activeAnunciosThisMonth = anuncios?.filter(anuncio => {
    const inicio = new Date(anuncio.fechaInicio);
    const fin = new Date(anuncio.fechaFin);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    return (inicio <= monthEnd && fin >= monthStart) && anuncio.estado === "Activo";
  }) || [];
  
  const occupiedParadas = new Set(activeAnunciosThisMonth.map(a => a.paradaId)).size;
  const occupancyRate = totalParadas > 0 ? Math.round((occupiedParadas / totalParadas) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar />
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Page Header */}
        <nav className="bg-white border-b-4 border-[#1a4d3c] sticky top-0 z-50">
          <div className="container flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-[#1a4d3c]">Calendario de Reservas</h1>

          
          {/* Mobile Menu Button */}
          <Button 
            variant="outline" 
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b-2 border-[#1a4d3c] shadow-lg">
          <div className="container py-4 space-y-2">
            <div className="text-sm text-gray-600 mb-4">Hola, {user?.name || user?.email}</div>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>Volver al Panel</Link>
            </Button>
          </div>
        </div>
      )}

      <div className="container py-12">
        <div className="mb-8">
          <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Calendario de Ocupación</h1>
          <p className="text-body text-lg text-gray-600">Vista mensual de anuncios activos</p>
        </div>

        {/* Nueva Reserva Button */}
        <div className="mb-6">
          <Button 
            className="bg-[#ff6b35] hover:bg-[#e65a25] text-white w-full md:w-auto"
            onClick={() => setIsReservaDialogOpen(true)}
          >
            Nueva Reserva
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Paradas Ocupadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#1a4d3c]">
                {occupiedParadas} / {totalParadas}
              </div>
              <p className="text-sm text-gray-600 mt-1">en {monthNames[month]}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasa de Ocupación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#ff6b35]">
                {occupancyRate}%
              </div>
              <p className="text-sm text-gray-600 mt-1">del inventario</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anuncios Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#1a4d3c]">
                {activeAnunciosThisMonth.length}
              </div>
              <p className="text-sm text-gray-600 mt-1">este mes</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Controls */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <Button variant="outline" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#1a4d3c]">
                  {monthNames[month]} {year}
                </h2>
                <Button variant="ghost" size="sm" onClick={goToToday} className="mt-2">
                  Hoy
                </Button>
              </div>
              
              <Button variant="outline" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {dayNames.map(day => (
                <div key={day} className="text-center font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="min-h-24 bg-gray-100 rounded" />
              ))}
              
              {/* Calendar days */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const anunciosToday = getAnunciosForDate(day);
                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                
                const isSelected = selectedDate?.toDateString() === new Date(year, month, day).toDateString();
                
                return (
                  <div
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`min-h-24 border rounded p-2 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-[#ff6b35] border-2 bg-orange-100' :
                      isToday ? 'border-[#1a4d3c] border-2 bg-green-50' : 
                      'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-sm mb-2">{day}</div>
                    <div className="space-y-2">
                      {/* Occupied count */}
                      {anunciosToday.length > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-[#ff6b35]"></div>
                          <span className="text-xs text-gray-700">
                            {anunciosToday.length} ocupada{anunciosToday.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      {/* Available count */}
                      {(() => {
                        const totalParadas = paradas?.length || 0;
                        const available = totalParadas - anunciosToday.length;
                        return available > 0 ? (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-[#1a4d3c]"></div>
                            <span className="text-xs text-gray-700">
                              {available} disponible{available !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Listings */}
        {selectedDate && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                Paradas Ocupadas - {selectedDate.toLocaleDateString('es-PR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getParadasForSelectedDate().length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay paradas ocupadas en esta fecha
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">ID</th>
                        <th className="text-left py-2 px-4">Localización</th>
                        <th className="text-left py-2 px-4">Ruta</th>
                        <th className="text-left py-2 px-4">Cliente</th>
                        <th className="text-left py-2 px-4">Tipo</th>
                        <th className="text-left py-2 px-4">Período</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getParadasForSelectedDate().map(({ parada, anuncio }) => (
                        <tr key={`${parada!.id}-${anuncio.id}`} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{parada!.cobertizoId}</td>
                          <td className="py-3 px-4">{parada!.localizacion}</td>
                          <td className="py-3 px-4">{parada!.ruta || '-'}</td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="bg-[#ff6b35] text-white">
                              {anuncio.cliente}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{anuncio.tipo}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(anuncio.fechaInicio).toLocaleDateString('es-PR')} - {new Date(anuncio.fechaFin).toLocaleDateString('es-PR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Leyenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#1a4d3c] bg-green-50 rounded"></div>
                <span className="text-sm">Día actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#ff6b35] bg-orange-100 rounded"></div>
                <span className="text-sm">Fecha seleccionada</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-[#1a4d3c] text-white">ID</Badge>
                <span className="text-sm">Parada con anuncio activo</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservation Modal */}
      <Dialog open={isReservaDialogOpen} onOpenChange={setIsReservaDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#1a4d3c]">Nueva Reserva</DialogTitle>
            <DialogDescription>
              Selecciona las fechas y paradas o rutas para crear una reserva
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Product Name */}
            <div>
              <Label htmlFor="producto">Producto/Anuncio *</Label>
              <Input
                id="producto"
                value={reservaForm.producto}
                onChange={(e) => setReservaForm({ ...reservaForm, producto: e.target.value })}
                placeholder="Ej: Coca Cola, iPhone 15, etc."
              />
            </div>
            
            {/* Client Name */}
            <div>
              <Label htmlFor="cliente">Nombre del Cliente *</Label>
              <Input
                id="cliente"
                value={reservaForm.cliente}
                onChange={(e) => setReservaForm({ ...reservaForm, cliente: e.target.value })}
                placeholder="Ej: Coca Cola Company, Apple Inc., etc."
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fechaInicio">Fecha de Inicio *</Label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={reservaForm.fechaInicio}
                  onChange={(e) => setReservaForm({ ...reservaForm, fechaInicio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="fechaFin">Fecha de Fin *</Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={reservaForm.fechaFin}
                  onChange={(e) => setReservaForm({ ...reservaForm, fechaFin: e.target.value })}
                />
              </div>
            </div>

            {/* Tipo */}
            <div>
              <Label htmlFor="tipo">Tipo de Anuncio</Label>
              <Select value={reservaForm.tipo} onValueChange={(v: any) => setReservaForm({ ...reservaForm, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fijo">Fijo</SelectItem>
                  <SelectItem value="Bonificación">Bonificación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Costo por Unidad */}
            <div>
              <Label htmlFor="costoPorUnidad">Costo por Unidad ($)</Label>
              <Input
                id="costoPorUnidad"
                type="number"
                step="0.01"
                min="0"
                value={reservaForm.costoPorUnidad}
                onChange={(e) => setReservaForm({ ...reservaForm, costoPorUnidad: e.target.value })}
                placeholder="Ej: 1500.00"
              />
            </div>

            {/* Selection Mode */}
            <div>
              <Label>Seleccionar por:</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  type="button"
                  variant={reservaForm.selectionMode === "paradas" ? "default" : "outline"}
                  onClick={() => setReservaForm({ ...reservaForm, selectionMode: "paradas", selectedRutas: [] })}
                  className={reservaForm.selectionMode === "paradas" ? "bg-[#1a4d3c] hover:bg-[#0f3a2a]" : ""}
                >
                  Paradas Específicas
                </Button>
                <Button
                  type="button"
                  variant={reservaForm.selectionMode === "rutas" ? "default" : "outline"}
                  onClick={() => setReservaForm({ ...reservaForm, selectionMode: "rutas", selectedParadas: [] })}
                  className={reservaForm.selectionMode === "rutas" ? "bg-[#1a4d3c] hover:bg-[#0f3a2a]" : ""}
                >
                  Por Rutas
                </Button>
              </div>
            </div>

            {/* Paradas Selection */}
            {reservaForm.selectionMode === "paradas" && (
              <div>
                <Label>Seleccionar Paradas Disponibles</Label>
                {!reservaForm.fechaInicio || !reservaForm.fechaFin ? (
                  <div className="border rounded-md p-4 mt-2 bg-yellow-50 text-yellow-800">
                    <p className="text-sm">Por favor selecciona las fechas de inicio y fin primero para ver las paradas disponibles.</p>
                  </div>
                ) : (
                  <>
                    {/* Search input for parada ID */}
                    <div className="mt-2 mb-3">
                      <Input
                        placeholder="Buscar por ID de parada (ej: 123, 456, 789)"
                        value={paradaSearchTerm}
                        onChange={(e) => setParadaSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="border rounded-md p-4 max-h-64 overflow-y-auto mt-2">
                      {getAvailableParadas().length === 0 ? (
                        <p className="text-sm text-gray-500">No hay paradas disponibles para las fechas seleccionadas.</p>
                      ) : (
                        getAvailableParadas().map(parada => (
                    <div key={parada.id} className={`flex items-center space-x-2 py-2 ${!parada.isAvailable ? 'opacity-60' : ''}`}>
                      <Checkbox
                        id={`parada-${parada.id}`}
                        checked={reservaForm.selectedParadas.includes(parada.id)}
                        disabled={!parada.isAvailable}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setReservaForm({
                              ...reservaForm,
                              selectedParadas: [...reservaForm.selectedParadas, parada.id]
                            });
                          } else {
                            setReservaForm({
                              ...reservaForm,
                              selectedParadas: reservaForm.selectedParadas.filter(id => id !== parada.id)
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={`parada-${parada.id}`}
                        className={`text-sm flex-1 ${parada.isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      >
                        <div>
                          <span className="font-medium">{parada.cobertizoId}</span>
                          <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded ml-1">{parada.orientacion}</span>
                          {" - "}{parada.direccion}
                          {parada.ruta && <span className="text-gray-500 ml-2">(Ruta: {parada.ruta})</span>}
                        </div>
                        {!parada.isAvailable && parada.availableAfter && (
                          <div className="text-xs text-red-600 mt-1">
                            Disponible después de {parada.availableAfter.toLocaleDateString('es-PR')}
                          </div>
                        )}
                      </label>
                    </div>
                        ))
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {reservaForm.selectedParadas.length} parada(s) seleccionada(s)
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Rutas Selection */}
            {reservaForm.selectionMode === "rutas" && (
              <div>
                <Label>Filtrar por Ruta</Label>
                {!reservaForm.fechaInicio || !reservaForm.fechaFin ? (
                  <div className="border rounded-md p-4 mt-2 bg-yellow-50 text-yellow-800">
                    <p className="text-sm">Por favor selecciona las fechas de inicio y fin primero para ver las paradas disponibles.</p>
                  </div>
                ) : (
                  <>
                    {/* Route filter dropdown */}
                    <Select 
                      value={reservaForm.selectedRutas[0] || "all"} 
                      onValueChange={(v) => {
                        if (v === "all") {
                          setReservaForm({ ...reservaForm, selectedRutas: [], selectedParadas: [] });
                        } else {
                          setReservaForm({ ...reservaForm, selectedRutas: [v], selectedParadas: [] });
                        }
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecciona una ruta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las rutas</SelectItem>
                        {Array.from(new Set(paradas?.map(p => p.ruta).filter(Boolean))).map(ruta => (
                          <SelectItem key={ruta} value={ruta!}>Ruta {ruta}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Show available paradas in selected route */}
                    {reservaForm.selectedRutas.length > 0 && (
                      <div className="mt-4">
                        <Label>Seleccionar Paradas Disponibles en Ruta {reservaForm.selectedRutas[0]}</Label>
                        {/* Search input for parada ID */}
                        <div className="mt-2 mb-3">
                          <Input
                            placeholder="Buscar por ID de parada (ej: 123, 456, 789)"
                            value={paradaSearchTerm}
                            onChange={(e) => setParadaSearchTerm(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="border rounded-md p-4 max-h-64 overflow-y-auto mt-2">
                          {(() => {
                            const availableInRoute = getAvailableParadas().filter(
                              p => p.ruta === reservaForm.selectedRutas[0]
                            );
                            
                            if (availableInRoute.length === 0) {
                              return <p className="text-sm text-gray-500">No hay paradas disponibles en esta ruta para las fechas seleccionadas.</p>;
                            }
                            
                            return availableInRoute.map(parada => (
                              <div key={parada.id} className={`flex items-center space-x-2 py-2 ${!parada.isAvailable ? 'opacity-60' : ''}`}>
                                <Checkbox
                                  id={`parada-ruta-${parada.id}`}
                                  checked={reservaForm.selectedParadas.includes(parada.id)}
                                  disabled={!parada.isAvailable}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setReservaForm({
                                        ...reservaForm,
                                        selectedParadas: [...reservaForm.selectedParadas, parada.id]
                                      });
                                    } else {
                                      setReservaForm({
                                        ...reservaForm,
                                        selectedParadas: reservaForm.selectedParadas.filter(id => id !== parada.id)
                                      });
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`parada-ruta-${parada.id}`}
                                  className={`text-sm flex-1 ${parada.isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                >
                                  <div>
                                    <span className="font-medium">{parada.cobertizoId}</span>
                                    <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded ml-1">{parada.orientacion}</span>
                                    {" - "}{parada.direccion}
                                  </div>
                                  {!parada.isAvailable && parada.availableAfter && (
                                    <div className="text-xs text-red-600 mt-1">
                                      Disponible después de {parada.availableAfter.toLocaleDateString('es-PR')}
                                    </div>
                                  )}
                                </label>
                              </div>
                            ));
                          })()}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          {reservaForm.selectedParadas.length} parada(s) seleccionada(s)
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReservaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#ff6b35] hover:bg-[#e65a25]"
              onClick={() => {
                // Validate
                if (!reservaForm.producto || !reservaForm.cliente || !reservaForm.fechaInicio || !reservaForm.fechaFin) {
                  toast.error("Por favor completa todos los campos requeridos");
                  return;
                }
                if (reservaForm.selectedParadas.length === 0) {
                  toast.error("Por favor selecciona al menos una parada");
                  return;
                }
                
                // Get paradas to reserve
                // Both modes now use selectedParadas since route mode also selects individual paradas
                const paradasToReserve = reservaForm.selectedParadas;
                
                // Create reservations for each parada
                let successCount = 0;
                let errorCount = 0;
                
                Promise.all(
                  paradasToReserve.map(paradaId =>
                    createAnuncio.mutateAsync({
                      paradaId,
                      producto: reservaForm.producto,
                      cliente: reservaForm.cliente,
                      tipo: reservaForm.tipo,
                      costoPorUnidad: reservaForm.costoPorUnidad ? parseFloat(reservaForm.costoPorUnidad) : undefined,
                      fechaInicio: new Date(reservaForm.fechaInicio),
                      fechaFin: new Date(reservaForm.fechaFin),
                      estado: "Programado",
                      notas: "",
                    }).then(() => {
                      successCount++;
                    }).catch(() => {
                      errorCount++;
                    })
                  )
                ).then(() => {
                  if (successCount > 0) {
                    toast.success(`${successCount} reserva(s) creada(s) exitosamente`);
                    utils.anuncios.list.invalidate();
                    utils.approvals.pending.invalidate();
                  }
                  if (errorCount > 0) {
                    toast.error(`${errorCount} reserva(s) fallaron`);
                  }
                  setIsReservaDialogOpen(false);
                  // Reset form
                  setReservaForm({
                    producto: "",
                    cliente: "",
                    fechaInicio: "",
                    fechaFin: "",
                    tipo: "Fijo",
                    costoPorUnidad: "",
                    selectionMode: "paradas",
                    selectedParadas: [],
                    selectedRutas: [],
                  });
                });
              }}
            >
              Crear Reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
