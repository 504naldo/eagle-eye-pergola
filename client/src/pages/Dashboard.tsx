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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, FolderOpen, Copy, Trash2, Edit, Eye, FileText } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  archived: "Archived",
};

export default function Dashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
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
          <a href={getLoginUrl()} className="inline-flex items-center px-6 py-2.5 rounded font-semibold text-sm" style={{ backgroundColor: "#C9A84C", color: "#111111" }}>
            Sign In
          </a>
        </div>
      </div>
    );
  }

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
            className="gap-2 font-semibold"
            style={{ backgroundColor: "#C9A84C", color: "#111111" }}
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
            <p className="text-gray-400 text-sm mb-6">Create your first pergola estimating project to get started.</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2" style={{ backgroundColor: "#C9A84C", color: "#111111" }}>
              <Plus size={16} /> Create First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects?.map(project => (
              <div key={project.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Card header */}
                <div className="bg-[#111111] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#C9A84C]" />
                    <span className="text-white text-xs font-medium truncate max-w-[160px]">{project.projectName}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium status-${project.status}`}>
                    {STATUS_LABELS[project.status]}
                  </span>
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
                      className="gap-1.5 flex-1 text-xs font-medium min-h-[40px] touch-manipulation"
                      style={{ backgroundColor: "#C9A84C", color: "#111111" }}
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
            ))}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-1 h-5 bg-[#C9A84C] rounded-full" />
              New Pergola Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                placeholder="e.g. Milestones Abbotsford Patio"
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
              onClick={() => createMutation.mutate(form)}
              disabled={!form.projectName.trim() || createMutation.isPending}
              style={{ backgroundColor: "#C9A84C", color: "#111111" }}
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
