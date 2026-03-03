import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { X, Info, AlertTriangle, CheckCircle, Megaphone } from "lucide-react";

type AnnouncementType = "info" | "alerta" | "exito" | "urgente";

const typeConfig: Record<AnnouncementType, {
  bg: string;
  border: string;
  icon: React.ReactNode;
  titleColor: string;
}> = {
  info: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    icon: <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />,
    titleColor: "text-blue-800",
  },
  alerta: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    icon: <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />,
    titleColor: "text-amber-800",
  },
  exito: {
    bg: "bg-green-50",
    border: "border-green-300",
    icon: <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />,
    titleColor: "text-green-800",
  },
  urgente: {
    bg: "bg-red-50",
    border: "border-red-300",
    icon: <Megaphone className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />,
    titleColor: "text-red-800",
  },
};

export default function AnnouncementToast() {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  const { data: announcement } = trpc.announcements.getActive.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (!announcement) return;

    // Check if this announcement was already dismissed in this session
    const dismissedKey = `announcement_dismissed_${announcement.id}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey);
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show with a short delay for a smooth entry
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, [announcement]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      setDismissed(true);
      if (announcement) {
        sessionStorage.setItem(`announcement_dismissed_${announcement.id}`, "1");
      }
    }, 300);
  };

  if (!announcement || dismissed) return null;

  const config = typeConfig[announcement.tipo as AnnouncementType] || typeConfig.info;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm w-full transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div
        className={`${config.bg} ${config.border} border rounded-lg shadow-lg p-4`}
      >
        <div className="flex items-start gap-3">
          {config.icon}
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${config.titleColor}`}>
              {announcement.titulo}
            </p>
            <p className="text-sm text-gray-700 mt-1 leading-relaxed">
              {announcement.mensaje}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors ml-1"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
