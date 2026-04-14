import { useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Trash2, Upload, FileText, Image, File, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16 MB

interface FilesTabProps {
  projectId: number;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={20} className="text-[#C9A84C]" />;
  if (mimeType === "application/pdf") return <FileText size={20} className="text-red-400" />;
  return <File size={20} className="text-gray-400" />;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function FilesTab({ projectId }: FilesTabProps) {
  const utils = trpc.useUtils();
  const { data: files = [], isLoading } = trpc.files.list.useQuery({ projectId });
  const uploadMutation = trpc.files.upload.useMutation({
    onSuccess: () => utils.files.list.invalidate({ projectId }),
  });
  const deleteMutation = trpc.files.delete.useMutation({
    onSuccess: () => utils.files.list.invalidate({ projectId }),
  });

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} exceeds the 16 MB limit.`);
      return;
    }
    setUploading(true);
    try {
      // Upload via server-side endpoint (uses storagePut to S3)
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
        fileUrl: string; fileKey: string; fileName: string; mimeType: string; fileSize: number;
      };
      await uploadMutation.mutateAsync({
        projectId,
        fileUrl: json.fileUrl,
        fileKey: json.fileKey,
        fileName: json.fileName,
        mimeType: json.mimeType,
        fileSize: json.fileSize,
      });
      toast.success(`${file.name} uploaded.`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload ${file.name}.`);
    } finally {
      setUploading(false);
    }
  }, [projectId, uploadMutation]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    Array.from(fileList).forEach(uploadFile);
  }, [uploadFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDelete = async (id: number, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;
    await deleteMutation.mutateAsync({ id, projectId });
    toast.success("File deleted.");
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors cursor-pointer ${
          dragging ? "border-[#C9A84C] bg-[#C9A84C]/5" : "border-gray-200 hover:border-[#C9A84C]/50"
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
          accept="image/*,application/pdf,.dwg,.dxf,.xlsx,.docx"
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={28} className="text-[#C9A84C] animate-spin" />
            <p className="text-sm text-gray-500">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={28} className="text-gray-400" />
            <p className="text-sm font-medium text-gray-700">Drag & drop files here, or click to browse</p>
            <p className="text-xs text-gray-400">Images, PDFs, DWG, DXF, Excel, Word — up to 16 MB each</p>
          </div>
        )}
      </div>

      {/* File grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-[#C9A84C]" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <File size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No files attached yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {files.map(file => (
            <div key={file.id} className="group relative border border-gray-100 rounded-lg overflow-hidden bg-gray-50 hover:border-[#C9A84C]/40 transition-colors">
              {/* Thumbnail or icon */}
              {file.mimeType.startsWith("image/") ? (
                <button
                  className="w-full aspect-square overflow-hidden block"
                  onClick={() => setLightbox(file.fileUrl)}
                >
                  <img
                    src={file.fileUrl}
                    alt={file.fileName}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </button>
              ) : (
                <a
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full aspect-square flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors block"
                >
                  {getFileIcon(file.mimeType)}
                </a>
              )}
              {/* File info */}
              <div className="p-2">
                <p className="text-xs font-medium text-gray-800 truncate" title={file.fileName}>{file.fileName}</p>
                <p className="text-[10px] text-gray-400">{formatBytes(file.sizeBytes ?? 0)}</p>
              </div>
              {/* Delete button */}
              <button
                className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 touch-manipulation"
                onClick={() => onDelete(file.id, file.fileName)}
                title="Delete file"
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
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
