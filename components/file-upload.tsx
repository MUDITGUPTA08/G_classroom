"use client"

import { useState, useRef, ChangeEvent, DragEvent } from "react"
import { Upload, X, File, FileText, Image as ImageIcon, Video, Music, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface FileWithPreview extends File {
  preview?: string
}

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  maxSizeMB?: number
  accept?: string
  disabled?: boolean
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxSizeMB = 10,
  accept = "*/*",
  disabled = false,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxSizeBytes = maxSizeMB * 1024 * 1024

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-8 w-8" />
    if (fileType.startsWith("video/")) return <Video className="h-8 w-8" />
    if (fileType.startsWith("audio/")) return <Music className="h-8 w-8" />
    if (fileType.includes("pdf") || fileType.includes("document") || fileType.includes("text"))
      return <FileText className="h-8 w-8" />
    if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("archive"))
      return <Archive className="h-8 w-8" />
    return <File className="h-8 w-8" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const validateFiles = (files: File[]): boolean => {
    setError("")

    if (selectedFiles.length + files.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files`)
      return false
    }

    for (const file of files) {
      if (file.size > maxSizeBytes) {
        setError(`File "${file.name}" exceeds ${maxSizeMB}MB limit`)
        return false
      }
    }

    return true
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || disabled) return

    const fileArray = Array.from(files)
    if (!validateFiles(fileArray)) return

    const newFiles = fileArray.map((file) => {
      const fileWithPreview = file as FileWithPreview
      if (file.type.startsWith("image/")) {
        fileWithPreview.preview = URL.createObjectURL(file)
      }
      return fileWithPreview
    })

    const updatedFiles = [...selectedFiles, ...newFiles]
    setSelectedFiles(updatedFiles)
    onFilesSelected(updatedFiles)
  }

  const removeFile = (index: number) => {
    const file = selectedFiles[index]
    if (file.preview) {
      URL.revokeObjectURL(file.preview)
    }

    const updatedFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(updatedFiles)
    onFilesSelected(updatedFiles)
    setError("")
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!disabled) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-gray-400"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">
          {isDragging ? "Drop files here" : "Click or drag files to upload"}
        </p>
        <p className="text-sm text-muted-foreground">
          Maximum {maxFiles} files, up to {maxSizeMB}MB each
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Files ({selectedFiles.length})</h4>
          <div className="grid gap-2">
            {selectedFiles.map((file, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground flex-shrink-0">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
