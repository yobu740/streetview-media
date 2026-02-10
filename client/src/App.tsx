import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Calendar from "./pages/Calendar";
import Metrics from "./pages/Metrics";
import MisReservas from "./pages/MisReservas";
import Anuncios from "./pages/Anuncios";
import Mantenimiento from "./pages/Mantenimiento";
import Facturas from "./pages/Facturas";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/calendar"} component={Calendar} />
      <Route path={"/metrics"} component={Metrics} />
      <Route path={"/mis-reservas"} component={MisReservas} />
      <Route path={"/anuncios"} component={Anuncios} />
      <Route path={"/mantenimiento"} component={Mantenimiento} />
      <Route path={"/facturas"} component={Facturas} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
