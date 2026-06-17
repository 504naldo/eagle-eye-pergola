import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import EagleEyeLayout from "@/components/EagleEyeLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, FolderOpen, Copy, Trash2, Edit, Eye } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  archived: "Archived",
};

const SCOPE_META: Record<string, { label: string; color: string; bg: string; borderColor: string; description: string; placeholder: string }> = {
  pergola: {
    label: "Pergola / Shade Structure",
    color: "#92712A",
    bg: "#FFFBF0",
    borderColor: "#E8C96A",
    description: "Louvred or fixed-slat aluminium pergola with optional glass enclosure",
    placeholder: "e.g. Milestones Abbotsford Patio",
  },
  canopy: {
    label: "Canopy",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    borderColor: "#93C5FD",
    description: "Wall-mounted or freestanding aluminium canopy with fascia options",
    placeholder: "e.g. Retail Entry Canopy — Main St",
  },
  enclosure: {
    label: "Simple Enclosure",
    color: "#065F46",
    bg: "#ECFDF5",
    borderColor: "#6EE7B7",
    description: "Aluminium-framed glass or panel enclosure system",
    placeholder: "e.g. Outdoor Dining Enclosure — Harbourside",
  },
  fencing: {
    label: "Fencing / Security",
    color: "#9A3412",
    bg: "#FFF7ED",
    borderColor: "#FDBA74",
    description: "SHS-framed welded wire mesh or chain link security fencing with optional gate",
    placeholder: "e.g. Parkade Bicycle Room — Level B1",
  },
  phasedEnclosure: {
    label: "Phased Enclosure",
    color: "#7C3AED",
    bg: "#F5F3FF",
    borderColor: "#C4B5FD",
    description: "Phased patio enclosure with city-approved drawing reference, Phase 1 (Lumon lower glass) and Phase 2 (louvered pergola)",
    placeholder: "e.g. Milestones Abbotsford — Phased Patio",
  },
  lumon: {
    label: "Lumon Glass System",
    color: "#0E7490",
    bg: "#ECFEFF",
    borderColor: "#67E8F9",
    description: "Lumon LGS/LGF sliding or fixed glass system — parametric shop drawings, QTO, and 8-page PDF package",
    placeholder: "e.g. Milestones Abbotsford — Lumon LGS",
  },
  tsawwassen: {
    label: "Lumon — Tsawwassen Method",
    color: "#1E3A5F",
    bg: "#EFF6FF",
    borderColor: "#3B82F6",
    description: "Governing-methodology compliant Lumon shop drawing package: EE-series sheets, QC checklist, responsibility matrix",
    placeholder: "e.g. Milestones Tsawwassen — Lumon Concept",
  },
};

type ScopeType = "pergola" | "canopy" | "enclosure" | "fencing" | "phasedEnclosure" | "lumon" | "tsawwassen";

export default function Dashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState<ScopeType>("pergola");
  const [editProject, setEditProject] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ projectName: "", clientName: "", location: "" });

  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.projects.list.useQuery(undefined, { enabled: isAuthenticated });
  const createMutation = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      utils.projects.list.invalidate();
      setCreateOpen(false);
      setForm({ projectName: "", clientName: "", location: "" });
      setSelectedScope("pergola");
      toast.success("Project created");
      navigate(`/project/${data.id}`);
    },
    onError: () => toast.error("Failed to create project"),
  });
  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => { utils.projects.list.invalidate(); setEditProject(null); toast.success("Project updated"); },
    onError: () => toast.error("Failed to update project"),
  });
  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => { utils.projects.list.invalidate(); setDeleteId(null); toast.success("Project deleted"); },
    onError: () => toast.error("Failed to delete project"),
  });
  const duplicateMutation = trpc.projects.duplicate.useMutation({
    onSuccess: (data) => { utils.projects.list.invalidate(); toast.success("Project duplicated"); navigate(`/project/${data.id}`); },
    onError: () => toast.error("Failed to duplicate project"),
  });

  if (!loading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to access your projects.</p>
          <a href={getLoginUrl()} className="inline-flex items-center px-6 py-2.5 rounded font-semibold text-sm bg-[#C9A84C] hover:bg-[#A07830] text-gray-900">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const scopeMeta = SCOPE_META[selectedScope];

  return (
    <EagleEyeLayout title="Project Dashboard">
      <div className="max-w-6xl mx-auto">
        {/* Actions bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-500 text-sm">{projects?.length ?? 0} project{projects?.length !== 1 ? "s" : ""}</p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
          className="gap-2 font-semibold bg-[#C9A84C] hover:bg-[#A07830] text-gray-900"
          >
            <Plus size={16} /> New Project
          </Button>
        </div>

        {/* Project grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : projects?.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
            <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No projects yet</h3>
            <p className="text-gray-400 text-sm mb-6">Create your first concept estimating project to get started.</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-[#C9A84C] hover:bg-[#A07830] text-gray-900">
              <Plus size={16} /> Create First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects?.map(project => {
              const scope = (project.scopeType ?? "pergola") as ScopeType;
              const meta = SCOPE_META[scope as keyof typeof SCOPE_META] ?? SCOPE_META.pergola;
              return (
                <div key={project.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  {/* Card header */}
                  <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: meta.bg, borderBottom: `1px solid ${meta.borderColor}` }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                      <span className="text-xs font-semibold truncate" style={{ color: meta.color }}>{project.projectName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: meta.borderColor + "66", color: meta.color }}>
                        {scope === "pergola" ? "Pergola" : scope === "canopy" ? "Canopy" : scope === "fencing" ? "Fencing" : scope === "phasedEnclosure" ? "Phased Enclosure" : scope === "lumon" ? "Lumon Glass" : scope === "tsawwassen" ? "Tsawwassen" : "Enclosure"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium status-${project.status}`}>
                        {STATUS_LABELS[project.status]}
                      </span>
                    </div>
                  </div>
                  {/* Card body */}
                  <div className="p-4">
                    <div className="space-y-1.5 mb-4">
                      {project.clientName && (
                        <p className="text-sm text-gray-700"><span className="text-gray-400 text-xs">Client:</span> {project.clientName}</p>
                      )}
                      {project.location && (
                        <p className="text-sm text-gray-700"><span className="text-gray-400 text-xs">Location:</span> {project.location}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        Updated {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1.5 flex-1 text-xs font-medium min-h-[40px] touch-manipulation bg-[#C9A84C] hover:bg-[#A07830] text-gray-900"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <Edit size={13} /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs flex-1 min-h-[40px] touch-manipulation"
                        onClick={() => navigate(`/project/${project.id}/preview`)}
                      >
                        <Eye size={13} /> Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs min-h-[40px] min-w-[40px] touch-manipulation"
                        onClick={() => duplicateMutation.mutate({ id: project.id })}
                        title="Duplicate project"
                      >
                        <Copy size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs text-red-500 hover:text-red-600 min-h-[40px] min-w-[40px] touch-manipulation"
                        onClick={() => setDeleteId(project.id)}
                        title="Delete project"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setSelectedScope("pergola"); setForm({ projectName: "", clientName: "", location: "" }); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-1 h-5 bg-[#C9A84C] rounded-full flex-shrink-0" />
              New Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Scope type selector */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 block">Project Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.entries(SCOPE_META) as [ScopeType, typeof SCOPE_META[ScopeType]][]).map(([type, meta]) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedScope(type);
                      setForm(f => ({ ...f, projectName: "" }));
                    }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all touch-manipulation ${
                      selectedScope === type
                        ? "border-2"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                    style={selectedScope === type ? { borderColor: meta.color, backgroundColor: meta.color + "15", color: meta.color } : {}}
                  >
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: selectedScope === type ? meta.color + "30" : "#F3F4F6" }}>
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: selectedScope === type ? meta.color : "#9CA3AF" }} />
                    </div>
                    <span className="text-center leading-tight">{type === "pergola" ? "Pergola" : type === "canopy" ? "Canopy" : type === "fencing" ? "Fencing" : type === "phasedEnclosure" ? "Phased" : type === "lumon" ? "Lumon" : type === "tsawwassen" ? "Tsawwassen" : "Enclosure"}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">{scopeMeta.description}</p>
            </div>

            {/* Project details */}
            <div>
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                placeholder={scopeMeta.placeholder}
                value={form.projectName}
                onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                placeholder="e.g. Milestones Grill + Bar"
                value={form.clientName}
                onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. Abbotsford, BC"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ ...form, scopeType: selectedScope as any })}
              disabled={!form.projectName.trim() || createMutation.isPending}
              className="bg-[#C9A84C] hover:bg-[#A07830] text-gray-900"
            >
              {createMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">This action cannot be undone. All project data will be permanently deleted.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EagleEyeLayout>
  );
}
