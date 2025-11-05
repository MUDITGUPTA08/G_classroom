"use client"

import { AdminSidebar } from "@/components/admin-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { logAuditAction } from "@/lib/supabase/admin-actions"

interface ClassForm {
  name: string
  description: string
  subject: string
  teacher_id: string
  allow_late_submissions: boolean
}

interface Teacher {
  id: string
  full_name: string
  email: string
}

export default function ClassEditPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.id as string

  const [form, setForm] = useState<ClassForm>({
    name: "",
    description: "",
    subject: "",
    teacher_id: "",
    allow_late_submissions: false,
  })
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [classId])

  async function loadData() {
    const supabase = createClient()
    try {
      // Load teachers
      const { data: teachersData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'teacher')
        .order('full_name')

      setTeachers(teachersData || [])

      // Load class data
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (error) throw error

      setForm({
        name: data.name,
        description: data.description || "",
        subject: data.subject,
        teacher_id: data.teacher_id,
        allow_late_submissions: data.allow_late_submissions || false,
      })
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Failed to load class')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: form.name,
          description: form.description,
          subject: form.subject,
          teacher_id: form.teacher_id,
          allow_late_submissions: form.allow_late_submissions,
        })
        .eq('id', classId)

      if (error) throw error

      // Log the action
      await logAuditAction({
        action: 'update_class',
        resourceType: 'class',
        resourceId: classId,
        details: { name: form.name, teacher_id: form.teacher_id }
      })

      alert('Class updated successfully!')
      router.push('/admin/classes')
    } catch (error: any) {
      console.error('Error saving class:', error)
      alert(`Failed to save class: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Link href="/admin">Admin</Link>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <Link href="/admin/classes">Classes</Link>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage>Edit Class</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit Class</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Class Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacher">Teacher</Label>
                    <Select value={form.teacher_id} onValueChange={(value) => setForm({ ...form, teacher_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.full_name} ({teacher.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allow_late_submissions"
                      checked={form.allow_late_submissions}
                      onCheckedChange={(checked) => setForm({ ...form, allow_late_submissions: checked })}
                    />
                    <Label htmlFor="allow_late_submissions">Allow Late Submissions</Label>
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.push('/admin/classes')}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
