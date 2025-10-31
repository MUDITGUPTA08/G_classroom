"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { Plus, Users, FileText, Copy, CheckCircle2 } from "lucide-react"
import type { Tables } from "@/lib/supabase/types"

type Profile = Tables<"profiles">

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [classData, setClassData] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadClassData()
  }, [id])

  async function loadClassData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    // Get profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    setProfile(profileData)

    // Get class details directly (RLS is now disabled)
    const { data: classInfo, error: classError } = await supabase
      .from("classes")
      .select("*")
      .eq("id", id)
      .single()

    if (classError || !classInfo) {
      console.error("Error loading class:", classError)
      setLoading(false)
      return
    }

    setClassData(classInfo)

    // Get students enrolled in class
    const { data: enrollments } = await supabase
      .from("class_enrollments")
      .select("profiles(*)")
      .eq("class_id", id)

    setStudents(enrollments?.map((e: any) => e.profiles) || [])

    // Get assignments for class
    const { data: assignmentsData } = await supabase
      .from("assignments")
      .select("*")
      .eq("class_id", id)
      .order("created_at", { ascending: false })

    setAssignments(assignmentsData || [])

    setLoading(false)
  }

  async function copyClassCode() {
    if (classData?.class_code) {
      await navigator.clipboard.writeText(classData.class_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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

  if (!classData) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-lg text-muted-foreground">Class not found</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const isTeacher = profile?.role === "teacher" && classData.teacher_id === profile.id

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
                  <BreadcrumbLink href="/dashboard/classes">Classes</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{classData.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{classData.name}</h1>
              <p className="text-muted-foreground mt-1">{classData.subject || "No subject"}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
                <span className="text-sm font-medium">Class Code:</span>
                <code className="text-lg font-mono font-bold">{classData.class_code}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyClassCode}
                  className="h-8 w-8 p-0"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {classData.description && (
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{classData.description}</p>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="assignments" className="w-full">
            <TabsList>
              <TabsTrigger value="assignments">
                <FileText className="h-4 w-4 mr-2" />
                Assignments
              </TabsTrigger>
              <TabsTrigger value="students">
                <Users className="h-4 w-4 mr-2" />
                Students ({students.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignments" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Class Assignments</h2>
                {isTeacher && (
                  <Link href={`/dashboard/assignments/new?classId=${id}`}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Assignment
                    </Button>
                  </Link>
                )}
              </div>

              {assignments.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No assignments yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {isTeacher ? "Create your first assignment to get started" : "No assignments have been posted yet"}
                    </p>
                    {isTeacher && (
                      <Link href={`/dashboard/assignments/new?classId=${id}`}>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Assignment
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <Link key={assignment.id} href={`/dashboard/assignments/${assignment.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer mb-2">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle>{assignment.title}</CardTitle>
                              {assignment.description && (
                                <CardDescription className="mt-2 line-clamp-2">
                                  {assignment.description}
                                </CardDescription>
                              )}
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <div>{assignment.points} points</div>
                              {assignment.due_date && (
                                <div>Due: {new Date(assignment.due_date).toLocaleDateString()}</div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <h2 className="text-xl font-semibold">Enrolled Students</h2>

              {students.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No students enrolled</h3>
                    <p className="text-muted-foreground text-center">
                      Share the class code with students to let them join
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {students.map((student) => (
                    <Card key={student.id}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="bg-primary text-primary-foreground flex items-center justify-center rounded-full h-10 w-10 font-semibold">
                            {student.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <CardTitle className="text-base">{student.full_name}</CardTitle>
                            <CardDescription className="text-xs">{student.email}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
