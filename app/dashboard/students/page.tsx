"use client"

import { useEffect, useState } from "react"
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
import { createClient } from "@/lib/supabase/client"
import { Users, GraduationCap, FileText } from "lucide-react"

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Get all students enrolled in teacher's classes
    const { data: enrollments } = await supabase
      .from("class_enrollments")
      .select("profiles(*), classes!inner(name, teacher_id)")
      .eq("classes.teacher_id", user.id)

    // Group students and count their enrollments
    const studentMap = new Map()

    enrollments?.forEach((enrollment: any) => {
      const student = enrollment.profiles
      if (studentMap.has(student.id)) {
        studentMap.get(student.id).classes.push(enrollment.classes.name)
      } else {
        studentMap.set(student.id, {
          ...student,
          classes: [enrollment.classes.name],
        })
      }
    })

    setStudents(Array.from(studentMap.values()))
    setLoading(false)
  }

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-lg text-muted-foreground">Loading...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
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
                  <BreadcrumbPage>Students</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div>
            <h1 className="text-3xl font-bold">All Students</h1>
            <p className="text-muted-foreground mt-1">
              Students enrolled across all your classes
            </p>
          </div>

          {students.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No students yet</h3>
                <p className="text-muted-foreground text-center">
                  Students will appear here once they enroll in your classes
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => (
                <Card key={student.id}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground flex items-center justify-center rounded-full h-12 w-12 font-semibold text-lg">
                        {student.full_name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{student.full_name}</CardTitle>
                        <CardDescription className="text-xs truncate">{student.email}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <GraduationCap className="h-4 w-4" />
                      <span>{student.classes.length} {student.classes.length === 1 ? "class" : "classes"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {student.classes.slice(0, 2).join(", ")}
                      {student.classes.length > 2 && ` +${student.classes.length - 2} more`}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
