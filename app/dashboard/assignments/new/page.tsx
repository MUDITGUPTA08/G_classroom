"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { FileUpload } from "@/components/file-upload"

export default function NewAssignmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const classId = searchParams.get("classId")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [classes, setClasses] = useState<any[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    class_id: classId || "",
    due_date: "",
    points: "100",
  })

  useEffect(() => {
    loadClasses()
  }, [])

  async function loadClasses() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Use RLS-bypassing function to load classes
    const { data: classesData } = await supabase
      .rpc('list_my_classes')

    // Sort by name
    const sortedClasses = (classesData || []).sort((a: any, b: any) =>
      a.name.localeCompare(b.name)
    )

    setClasses(sortedClasses)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: insertError } = await supabase
        .from("assignments")
        .insert({
          title: formData.title,
          description: formData.description,
          class_id: formData.class_id,
          due_date: formData.due_date || null,
          points: parseInt(formData.points),
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      // Upload files to storage if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split(".").pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const storageFilePath = `${data.id}/${fileName}`
          const fullFilePath = `assignment-attachments/${storageFilePath}`

          const { error: uploadError } = await supabase.storage
            .from("assignment-attachments")
            .upload(storageFilePath, file)

          if (uploadError) {
            console.error("Error uploading file:", uploadError)
            continue
          }

          // Save file metadata with full path (includes bucket name)
          await supabase.from("assignment_attachments").insert({
            assignment_id: data.id,
            file_name: file.name,
            file_path: fullFilePath,
            file_size: file.size,
            file_type: file.type,
          })
        }
      }

      router.push(`/dashboard/assignments/${data.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to create assignment")
      setLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard/assignments">Assignments</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>New Assignment</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="max-w-2xl mx-auto w-full">
            <Card>
              <CardHeader>
                <CardTitle>Create New Assignment</CardTitle>
                <CardDescription>
                  Create a new assignment for your class
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="class">Class *</Label>
                    <Select
                      value={formData.class_id}
                      onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                      disabled={loading || !!classId}
                      required
                    >
                      <SelectTrigger id="class">
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Assignment Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Chapter 5 Homework"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Provide instructions for the assignment..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="points">Points *</Label>
                      <Input
                        id="points"
                        type="number"
                        min="0"
                        placeholder="100"
                        value={formData.points}
                        onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input
                        id="due_date"
                        type="datetime-local"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Attach Files (Optional)</Label>
                    <FileUpload
                      onFilesSelected={setSelectedFiles}
                      maxFiles={5}
                      maxSizeMB={10}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading || !formData.class_id}>
                      {loading ? "Creating..." : "Create Assignment"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
