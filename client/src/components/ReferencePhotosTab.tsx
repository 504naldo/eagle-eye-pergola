import { useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Trash2, Upload, ImagePlus, Loader2, X, Info } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16 MB
const MAX_PHOTOS = 4;

interface ReferencePhotosTabProps {
  projectId: number;
}

export default function ReferencePhotosTab({ projectId }: ReferencePhotosTabProps) {
  const utils = trpc.useUtils();
  const { data: photos = [], isLoading } = trpc.referencePhotos.list.useQuery({ projectId });
  const uploadMutation = trpc.referencePhotos.upload.useMutation({
    onSuccess: () => utils.referencePhotos.list.invalidate({ projectId }),
  });
  const deleteMutation = trpc.referencePhotos.delete.useMutation({
    onSuccess: () => utils.referencePhotos.list.invalidate({ projectId }),
  });

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are accepted as reference photos.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} exceeds the 16 MB limit.`);
      return;
    }
    if ((photos?.length ?? 0) >= MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} reference photos allowed. Delete one first.`);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(`/api/upload/${projectId}`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({})) as { error?: string };
        throw new Error(errJson.error ?? `Upload failed (${uploadRes.status})`);
      }
      const json = await uploadRes.json() as {
        fileUrl: string; fileKey: string; fileName: string;
      };
      await uploadMutation.mutateAsync({
        projectId,
        imageUrl: json.fileUrl,
        fileKey: json.fileKey,
        fileName: json.fileName,
      });
      toast.success(`${file.name} added as reference photo.`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload ${file.name}.`);
    } finally {
      setUploading(false);
    }
  }, [projectId, photos, uploadMutation]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const remaining = MAX_PHOTOS - (photos?.length ?? 0);
    Array.from(fileList).slice(0, remaining).forEach(uploadPhoto);
  }, [uploadPhoto, photos]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDelete = async (id: number, fileName: string) => {
    if (!confirm(`Remove reference photo "${fileName}"?`)) return;
    await deleteMutation.mutateAsync({ id, projectId });
    toast.success("Reference photo removed.");
  };

  const atLimit = (photos?.length ?? 0) >= MAX_PHOTOS;

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-lg p-4">
        <Info size={16} className="text-[#C9A84C] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#C9A84C]">Reference Photos for AI Renderings</p>
          <p className="text-xs text-gray-400 mt-1">
            Upload up to {MAX_PHOTOS} reference images (site photos, inspiration images, or similar projects).
            When you generate an AI rendering, these photos will guide the style, materials, and context of the output.
          </p>
        </div>
      </div>

      {/* Drop zone — only shown when under limit */}
      {!atLimit && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors cursor-pointer ${
            dragging ? "border-[#C9A84C] bg-[#C9A84C]/5" : "border-[#333] hover:border-[#C9A84C]/50"
          }`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*"
            onChange={e => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={28} className="text-[#C9A84C] animate-spin" />
              <p className="text-sm text-gray-400">Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImagePlus size={28} className="text-gray-500" />
              <p className="text-sm font-medium text-gray-300">Drag & drop reference photos here, or click to browse</p>
              <p className="text-xs text-gray-500">
                Images only — up to 16 MB each &nbsp;·&nbsp; {MAX_PHOTOS - (photos?.length ?? 0)} slot{MAX_PHOTOS - (photos?.length ?? 0) !== 1 ? "s" : ""} remaining
              </p>
            </div>
          )}
        </div>
      )}

      {atLimit && (
        <div className="border border-[#C9A84C]/20 rounded-lg p-4 text-center">
          <p className="text-sm text-[#C9A84C] font-medium">Maximum {MAX_PHOTOS} reference photos reached.</p>
          <p className="text-xs text-gray-500 mt-1">Delete a photo below to add a new one.</p>
        </div>
      )}

      {/* Photo grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-[#C9A84C]" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-10 text-gray-600">
          <ImagePlus size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No reference photos yet.</p>
          <p className="text-xs mt-1">Upload images above to guide AI rendering generation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="group relative border border-[#333] rounded-lg overflow-hidden bg-[#111] hover:border-[#C9A84C]/40 transition-colors"
            >
              <button
                className="w-full aspect-square overflow-hidden block"
                onClick={() => setLightbox(photo.imageUrl)}
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.fileName}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
              </button>
              {/* Label */}
              <div className="px-2 py-1.5 flex items-center justify-between">
                <span className="text-[10px] text-[#C9A84C] font-bold uppercase tracking-wider">Ref {idx + 1}</span>
                <span className="text-[10px] text-gray-500 truncate max-w-[80px]" title={photo.fileName}>{photo.fileName}</span>
              </div>
              {/* Delete button */}
              <button
                className="absolute top-1.5 right-1.5 bg-black/70 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 touch-manipulation"
                onClick={() => onDelete(photo.id, photo.fileName)}
                title="Remove reference photo"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-[#C9A84C] transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X size={28} />
          </button>
          <img
            src={lightbox}
            alt="Reference photo"
            className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
