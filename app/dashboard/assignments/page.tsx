"use client"

import { useEffect, useState } from "react"
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
import { createClient } from "@/lib/supabase/client"
import { Plus, FileText, Clock, CheckCircle2 } from "lucide-react"
import type { Tables } from "@/lib/supabase/types"

type Profile = Tables<"profiles">

export default function AssignmentsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAssignments()
  }, [])

  async function loadAssignments() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Get profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    setProfile(profileData)

    if (profileData?.role === "teacher") {
      // Get all assignments for teacher's classes
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select("*, classes!inner(name, teacher_id)")
        .eq("classes.teacher_id", user.id)
        .order("created_at", { ascending: false })

      setAssignments(assignmentsData || [])
    } else if (profileData?.role === "student") {
      // Get assignments for enrolled classes
      const { data: enrollments } = await supabase
        .from("class_enrollments")
        .select("class_id")
        .eq("student_id", user.id)

      const classIds = enrollments?.map(e => e.class_id) || []

      if (classIds.length > 0) {
        const { data: assignmentsData } = await supabase
          .from("assignments")
          .select("*, classes(name)")
          .in("class_id", classIds)
          .order("created_at", { ascending: false })

        setAssignments(assignmentsData || [])

        // Get submission status
        const { data: submissionsData } = await supabase
          .from("submissions")
          .select("assignment_id, status")
          .eq("student_id", user.id)

        setSubmissions(submissionsData || [])
      }
    }

    setLoading(false)
  }

  const getSubmissionStatus = (assignmentId: string) => {
    return submissions.find(s => s.assignment_id === assignmentId)
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

  const isTeacher = profile?.role === "teacher"

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
                  <BreadcrumbPage>Assignments</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {isTeacher ? "All Assignments" : "My Assignments"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isTeacher ? "Manage assignments across all your classes" : "View and complete your assignments"}
              </p>
            </div>
            {isTeacher && (
              <Link href="/dashboard/assignments/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
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
                  <Link href="/dashboard/assignments/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Assignment
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const submission = getSubmissionStatus(assignment.id)
                const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date()

                return (
                  <Link key={assignment.id} href={`/dashboard/assignments/${assignment.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle>{assignment.title}</CardTitle>
                              {!isTeacher && submission && (
                                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Submitted
                                </span>
                              )}
                              {!isTeacher && !submission && isOverdue && (
                                <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                  <Clock className="h-3 w-3" />
                                  Overdue
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {assignment.classes?.name || "Unknown Class"}
                            </div>
                            {assignment.description && (
                              <CardDescription className="mt-2 line-clamp-2">
                                {assignment.description}
                              </CardDescription>
                            )}
                          </div>
                          <div className="text-right text-sm ml-4">
                            <div className="font-semibold">{assignment.points} points</div>
                            {assignment.due_date && (
                              <div className={`text-muted-foreground ${isOverdue ? "text-red-500" : ""}`}>
                                Due: {new Date(assignment.due_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
