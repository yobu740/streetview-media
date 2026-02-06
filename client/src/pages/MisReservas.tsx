import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Calendar, MapPin, User, Clock } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function MisReservas() {
  const { user, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get user's reservations
  const { data: reservations, isLoading, refetch } = trpc.anuncios.myReservations.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a4d3c] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando reservas...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md text-center">
          <p className="text-lg mb-4">Debes iniciar sesión para ver tus reservas</p>
          <Button asChild>
            <Link href="/admin">Iniciar Sesión</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pendiente</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Aprobada</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rechazada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b-4 border-[#1a4d3c] bg-white sticky top-0 z-50">
        <div className="container flex items-center justify-between h-20">
          <Link href="/">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png"
              alt="Streetview Media"
              className="h-12 cursor-pointer"
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-body font-medium hover:text-[#ff6b35] transition-colors">
              Inicio
            </Link>
            <Link href="/calendar" className="text-body font-medium hover:text-[#ff6b35] transition-colors">
              Calendario
            </Link>
            <Link href="/mis-reservas" className="text-body font-medium text-[#ff6b35]">
              Mis Reservas
            </Link>
            {user.role === "admin" && (
              <>
                <Link href="/admin" className="text-body font-medium hover:text-[#ff6b35] transition-colors">
                  Admin
                </Link>
                <Link href="/metrics" className="text-body font-medium hover:text-[#ff6b35] transition-colors">
                  Métricas
                </Link>
              </>
            )}
            <div className="text-sm text-muted-foreground">
              {user.name}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#1a4d3c] hover:text-[#ff6b35] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t-2 border-[#1a4d3c]">
            <div className="container py-4 flex flex-col gap-4">
              <Link
                href="/"
                className="text-body font-medium text-lg py-2 hover:text-[#ff6b35] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Inicio
              </Link>
              <Link
                href="/calendar"
                className="text-body font-medium text-lg py-2 hover:text-[#ff6b35] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Calendario
              </Link>
              <Link
                href="/mis-reservas"
                className="text-body font-medium text-lg py-2 text-[#ff6b35]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Mis Reservas
              </Link>
              {user.role === "admin" && (
                <>
                  <Link
                    href="/admin"
                    className="text-body font-medium text-lg py-2 hover:text-[#ff6b35] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
                  </Link>
                  <Link
                    href="/metrics"
                    className="text-body font-medium text-lg py-2 hover:text-[#ff6b35] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Métricas
                  </Link>
                </>
              )}
              <div className="text-sm text-muted-foreground py-2">
                {user.name}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Mis Reservas</h1>
          <p className="text-body text-muted-foreground">
            Aquí puedes ver todas tus reservas y su estado de aprobación
          </p>
        </div>

        {!reservations || reservations.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No tienes reservas</h3>
            <p className="text-muted-foreground mb-6">
              Crea tu primera reserva desde el calendario
            </p>
            <Button asChild>
              <Link href="/calendar">Ir al Calendario</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reservations.map((reservation: any) => (
              <Card key={reservation.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-[#1a4d3c]">
                        {reservation.cliente}
                      </h3>
                      {getStatusBadge(reservation.approvalStatus)}
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>
                          Parada #{reservation.paradaId}
                          {reservation.parada && ` - ${reservation.parada.ruta}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(reservation.fechaInicio).toLocaleDateString()} - {new Date(reservation.fechaFin).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>Tipo: {reservation.tipo}</span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          Creada: {new Date(reservation.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {reservation.approvedAt && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        {reservation.approvalStatus === "approved" ? "Aprobada" : "Rechazada"} el{" "}
                        {new Date(reservation.approvedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Badge
                      variant="outline"
                      className={
                        reservation.estado === "Programado"
                          ? "bg-blue-50 text-blue-700 border-blue-300"
                          : "bg-gray-50 text-gray-700 border-gray-300"
                      }
                    >
                      {reservation.estado}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
