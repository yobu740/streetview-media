import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Calendar() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: paradas } = trpc.paradas.list.useQuery();
  const { data: anuncios } = trpc.anuncios.list.useQuery();

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
      return date >= inicio && date <= fin && anuncio.estado === "Activo";
    }) || [];
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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b-4 border-[#1a4d3c]">
        <div className="container flex items-center justify-between h-20">
          <Link href="/admin">
            <img 
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png" 
              alt="Streetview Media" 
              className="h-12 cursor-pointer"
            />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Hola, {user?.name || user?.email}</span>
            <Button variant="outline" asChild>
              <Link href="/admin">Volver al Panel</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        <div className="mb-8">
          <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Calendario de Ocupación</h1>
          <p className="text-body text-lg text-gray-600">Vista mensual de anuncios activos</p>
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
                
                return (
                  <div
                    key={day}
                    className={`min-h-24 border rounded p-2 ${
                      isToday ? 'border-[#ff6b35] border-2 bg-orange-50' : 'border-gray-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">{day}</div>
                    <div className="space-y-1">
                      {anunciosToday.slice(0, 3).map(anuncio => {
                        const parada = paradas?.find(p => p.id === anuncio.paradaId);
                        return (
                          <Badge
                            key={anuncio.id}
                            variant="secondary"
                            className="text-xs block truncate bg-[#1a4d3c] text-white hover:bg-[#0f3a2a]"
                            title={`${parada?.cobertizoId} - ${anuncio.cliente}`}
                          >
                            {parada?.cobertizoId}
                          </Badge>
                        );
                      })}
                      {anunciosToday.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{anunciosToday.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Leyenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#ff6b35] bg-orange-50 rounded"></div>
                <span className="text-sm">Día actual</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-[#1a4d3c] text-white">ID</Badge>
                <span className="text-sm">Parada con anuncio activo</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
