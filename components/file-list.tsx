"use client"

import { useState } from "react"
import { Download, Trash2, File, FileText, Image as ImageIcon, Video, Music, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export interface FileItem {
  id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  created_at: string
}

interface FileListProps {
  files: FileItem[]
  onDelete?: (fileId: string) => Promise<void>
  canDelete?: boolean
  emptyMessage?: string
}

export function FileList({
  files,
  onDelete,
  canDelete = false,
  emptyMessage = "No files uploaded",
}: FileListProps) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-6 w-6" />
    if (fileType.startsWith("video/")) return <Video className="h-6 w-6" />
    if (fileType.startsWith("audio/")) return <Music className="h-6 w-6" />
    if (fileType.includes("pdf") || fileType.includes("document") || fileType.includes("text"))
      return <FileText className="h-6 w-6" />
    if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("archive"))
      return <Archive className="h-6 w-6" />
    return <File className="h-6 w-6" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleDownload = async (file: FileItem) => {
    setDownloading(file.id)
    try {
      const supabase = createClient()

      // Extract bucket name and file path
      const bucketName = file.file_path.split("/")[0]
      const filePath = file.file_path.split("/").slice(1).join("/")

      console.log("Download attempt:", {
        fullPath: file.file_path,
        bucketName,
        filePath,
        fileName: file.file_name
      })

      // Get public URL for the file
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      console.log("Public URL:", data?.publicUrl)

      if (!data?.publicUrl) {
        throw new Error("Failed to get download URL")
      }

      // Fetch the file and trigger download
      const response = await fetch(data.publicUrl)
      console.log("Fetch response status:", response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Download error response:", errorText)
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = file.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading file:", error)
      alert(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDownloading(null)
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!onDelete) return

    if (!confirm("Are you sure you want to delete this file?")) return

    setDeleting(fileId)
    try {
      await onDelete(fileId)
    } catch (error) {
      console.error("Error deleting file:", error)
      alert("Failed to delete file")
    } finally {
      setDeleting(null)
    }
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <Card key={file.id} className="p-3">
          <div className="flex items-center gap-3">
            <div className="text-muted-foreground flex-shrink-0">
              {getFileIcon(file.file_type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.file_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(file.file_size)}</span>
                <span>•</span>
                <span>{formatDate(file.created_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDownload(file)}
                disabled={downloading === file.id}
              >
                <Download className="h-4 w-4" />
                {downloading === file.id ? "..." : ""}
              </Button>
              {canDelete && onDelete && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(file.id)}
                  disabled={deleting === file.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
