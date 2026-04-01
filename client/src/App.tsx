import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Calendar from "./pages/Calendar";
import Metrics from "./pages/Metrics";
import MisReservas from "./pages/MisReservas";
import Anuncios from "./pages/Anuncios";
import Mantenimiento from "./pages/Mantenimiento";
import Facturas from "./pages/Facturas";
import Facturacion from "./pages/Facturacion";
import Seguimientos from "./pages/Seguimientos";
import Notificaciones from "./pages/Notificaciones";
import Instalacion from "./pages/Instalacion";
import Clientes from "./pages/Clientes";
import DashboardHeader from "./components/DashboardHeader";
import { MobileNavProvider } from "./contexts/MobileNavContext";

/** Wrapper that scopes the modern SaaS dashboard styles.
 *  The public landing page (/) is intentionally excluded to preserve Urban Brutalism. */
function D({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("dashboard-ui");
    return () => document.body.classList.remove("dashboard-ui");
  }, []);
  return (
    <MobileNavProvider>
      <div className="dashboard-ui">
        <DashboardHeader />
        {children}
      </div>
    </MobileNavProvider>
  );
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/admin"}>         <D><Admin /></D>         </Route>
      <Route path={"/calendar"}>      <D><Calendar /></D>      </Route>
      <Route path={"/metrics"}>       <D><Metrics /></D>       </Route>
      <Route path={"/mis-reservas"}>  <D><MisReservas /></D>   </Route>
      <Route path={"/anuncios"}>      <D><Anuncios /></D>      </Route>
      <Route path={"/mantenimiento"}> <D><Mantenimiento /></D> </Route>
      <Route path={"/facturas"}>      <D><Facturas /></D>      </Route>
      <Route path={"/facturacion"}>   <D><Facturacion /></D>   </Route>
      <Route path={"/seguimientos"}>  <D><Seguimientos /></D>  </Route>
      <Route path={"/notificaciones"}><D><Notificaciones /></D></Route>
      <Route path={"/instalacion"}>   <D><Instalacion /></D>   </Route>
      <Route path={"/clientes"}>      <D><Clientes /></D>      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  
  return (
    <ErrorBoundary>
      <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey || ""}>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </GoogleReCaptchaProvider>
    </ErrorBoundary>
  );
}

export default App;
