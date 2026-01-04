import { useState } from "react";
import { fileApi, FileMetadata, UploadFileResponse } from "../api/client";

type Props = {
  attachedFiles: number[];
  onChange: (fileIds: number[]) => void;
};

export default function FileUploader({ attachedFiles, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([]);
  const [error, setError] = useState<string>("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    try {
      const uploads: UploadFileResponse[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError(`File "${file.name}" exceeds 10MB limit`);
          continue;
        }

        const result = await fileApi.upload(file);
        uploads.push(result);
      }

      if (uploads.length > 0) {
        const newFileIds = uploads.map((f) => parseInt(f.file_id));
        onChange([...attachedFiles, ...newFileIds]);
        
        // Add to local display list
        const newFiles: FileMetadata[] = uploads.map((u) => ({
          file_id: u.file_id,
          filename: u.filename,
          content_type: u.content_type,
          size: u.size,
          hash: u.hash,
          uploaded_at: new Date().toISOString(),
        }));
        setUploadedFiles([...uploadedFiles, ...newFiles]);
      }

      // Reset input
      e.target.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (fileId: number) => {
    try {
      await fileApi.delete(fileId);
      onChange(attachedFiles.filter((id) => id !== fileId));
      setUploadedFiles(uploadedFiles.filter((f) => parseInt(f.file_id) !== fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove file");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (contentType: string): string => {
    if (contentType.startsWith("image/")) return "🖼️";
    if (contentType.startsWith("video/")) return "🎥";
    if (contentType.includes("pdf")) return "📄";
    if (contentType.includes("word") || contentType.includes("document")) return "📝";
    if (contentType.includes("sheet") || contentType.includes("excel")) return "📊";
    return "📎";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Attach Files (optional)
        </label>
        <label className="btn cursor-pointer">
          {uploading ? "Uploading..." : "+ Add Files"}
          <input
            type="file"
            className="hidden"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      </div>

      {error && (
        <div className="p-2 bg-red-100 border border-red-400 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file) => (
            <div
              key={file.file_id}
              className="flex items-center justify-between gap-2 border border-gray-200 rounded p-2 bg-gray-50"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">{getFileIcon(file.content_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{file.filename}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.content_type.split("/")[1] || "file"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {file.content_type.startsWith("image/") && (
                  <a
                    href={fileApi.getUrl(file.file_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    Preview
                  </a>
                )}
                <a
                  href={fileApi.getUrl(file.file_id)}
                  download
                  className="btn-secondary"
                >
                  Download
                </a>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleRemove(file.file_id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploadedFiles.length === 0 && (
        <p className="text-xs text-gray-500">
          No files attached. Click "Add Files" to upload PDFs, images, or documents (max 10MB each).
        </p>
      )}
    </div>
  );
}
