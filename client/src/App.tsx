import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useParams } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import ProjectEditor from "./pages/ProjectEditor";
import CanopyEditor from "./pages/CanopyEditor";
import EnclosureEditor from "./pages/EnclosureEditor";
import FencingEditor from "./pages/FencingEditor";
import PhasedEnclosureEditor from "./pages/PhasedEnclosureEditor";
import DrawingPreview from "./pages/DrawingPreview";
import ConceptPackage from "./pages/ConceptPackage";
import LumonSystemDetails from "./pages/LumonSystemDetails";
import Home from "./pages/Home";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

/**
 * Scope-aware dispatcher: loads the project, reads scopeType, renders the correct editor.
 */
function ProjectRouter() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "0", 10);
  const { data: project, isLoading } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !isNaN(projectId) && projectId > 0 }
  );

  if (isLoading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#C9A84C]" size={32} />
      </div>
    );
  }

  const scope = project.scopeType ?? "pergola";

  if (scope === "canopy") return <CanopyEditor projectId={projectId} />;
  if (scope === "enclosure") return <EnclosureEditor projectId={projectId} />;
  if (scope === "fencing") return <FencingEditor projectId={projectId} />;
  if (scope === "phasedEnclosure") return <PhasedEnclosureEditor />;
  // Default: pergola — ProjectEditor uses useParams internally
  return <ProjectEditor />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/project/:id" component={ProjectRouter} />
      <Route path="/project/:id/preview" component={DrawingPreview} />
      <Route path="/project/:id/concept" component={ConceptPackage} />
      <Route path="/project/:id/lumon">
        {() => {
          const { id } = useParams<{ id: string }>();
          return <LumonSystemDetails projectId={id} />;
        }}
      </Route>
      <Route path="/404" component={NotFound} />
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
