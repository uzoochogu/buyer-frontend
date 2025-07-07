import { useState, useRef } from "react";
import { mediaService } from "../api/services";

const MediaUpload = ({
  onUploadComplete,
  allowMultiple = false,
  maxFileSize = 50 * 1024 * 1024,
  maxFileNumber = 5,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const validateFile = (file) => {
    if (file.size > maxFileSize) {
      throw new Error(
        `File ${file.name} is too large. Maximum size is ${
          maxFileSize / (1024 * 1024)
        }MB`
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/mov",
      "video/avi",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not supported`);
    }

    return true;
  };

  const handleFiles = (files) => {
    if (files.length === 0) return;

    try {
      Array.from(files).forEach(validateFile);

      const filesWithPreviews = Array.from(files).map((file) => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: URL.createObjectURL(file),
      }));

      setSelectedFiles((prev) => [...prev, ...filesWithPreviews]);
    } catch (error) {
      setError(error.message || "Invalid file");
    }
  };

  const handleFileSelect = (event) => {
    handleFiles(event.target.files);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZoneRef.current.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      // Revoke object URL to prevent memory leaks
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0 || selectedFiles.length > maxFileNumber) {
      setError("You can only upload 1 to 5 files.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = selectedFiles.map(async (fileData) => {
        setUploadProgress((prev) => ({ ...prev, [fileData.name]: 0 }));

        const uploadResponse = await mediaService.getUploadUrl(
          fileData.name,
          false,
          fileData.type
        );

        const { upload_url, object_key } = uploadResponse.data;

        // Upload with progress tracking
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setUploadProgress((prev) => ({
                ...prev,
                [fileData.name]: progress,
              }));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status === 200) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () =>
            reject(new Error("Upload failed"))
          );

          xhr.open("PUT", upload_url);
          xhr.setRequestHeader("Content-Type", fileData.type);
          xhr.send(fileData.file);
        });

        // Verify upload
        const uploaded = await mediaService.verifyMediaObject(object_key);
        if (!uploaded?.data?.exists) {
          throw new Error("media not uploaded to server");
        }

        return {
          name: fileData.name,
          objectKey: object_key,
          type: fileData.type,
          size: fileData.size,
          preview: fileData.preview,
          // url: `${
          //   import.meta.env.VITE_APP_BACKEND_URL
          // }/api/v1/media/${object_key}`,  // no url for now
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      onUploadComplete(uploadedFiles);

      // successful upload, cleared files
      setSelectedFiles([]);
      setUploadProgress({});
    } catch (error) {
      console.error("Upload error:", error);
      setError(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      ref={dropZoneRef}
      className={`border-2 border-dashed ${
        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
      } 
                 rounded-lg p-6 text-center hover:border-gray-400 transition-colors`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={allowMultiple}
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {/* File selection UI */}
      <div>
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="mt-4">
          <button
            type="button"
            onClick={triggerFileSelect}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            disabled={uploading}
          >
            Select {allowMultiple ? "Files" : "File"}
          </button>
          <p className="mt-2 text-sm text-gray-500">
            or drag and drop {allowMultiple ? "files" : "a file"} here
          </p>
        </div>
      </div>

      {/* Preview of selected files */}
      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Selected Files:
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="relative border rounded-md overflow-hidden"
              >
                {file.type.startsWith("image/") ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-full h-24 object-cover"
                  />
                ) : file.type.startsWith("video/") ? (
                  <div className="relative w-full h-24 bg-black">
                    <video
                      src={file.preview}
                      className="w-full h-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-none bg-opacity-30">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-24 flex items-center justify-center bg-gray-100">
                    <span className="text-gray-500 text-sm">{file.name}</span>
                  </div>
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  ×
                </button>
                <div className="p-2 text-xs truncate bg-gray-50">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && Object.keys(uploadProgress).length > 0 && (
        <div className="mt-4">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span className="truncate max-w-xs">{fileName}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload button */}
      {selectedFiles.length > 0 && !uploading && (
        <button
          onClick={uploadFiles}
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
        >
          Upload {selectedFiles.length}{" "}
          {selectedFiles.length === 1 ? "File" : "Files"}
        </button>
      )}
    </div>
  );
};

export default MediaUpload;
