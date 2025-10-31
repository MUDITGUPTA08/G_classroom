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
import { createClient } from "@/lib/supabase/client"
import { FileText, Clock, CheckCircle2 } from "lucide-react"
import type { Tables } from "@/lib/supabase/types"

type Profile = Tables<"profiles">

export default function SubmissionsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubmissions()
  }, [])

  async function loadSubmissions() {
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
      // Get all submissions for teacher's classes
      const { data: submissionsData } = await supabase
        .from("submissions")
        .select("*, assignments(title, points, classes!inner(name, teacher_id)), profiles(full_name, email)")
        .eq("assignments.classes.teacher_id", user.id)
        .order("submitted_at", { ascending: false })

      setSubmissions(submissionsData || [])
    } else if (profileData?.role === "student") {
      // Get student's submissions
      const { data: submissionsData } = await supabase
        .from("submissions")
        .select("*, assignments(title, points, classes(name))")
        .eq("student_id", user.id)
        .order("submitted_at", { ascending: false })

      setSubmissions(submissionsData || [])
    }

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

  const isTeacher = profile?.role === "teacher"

  // Filter pending and graded submissions for teachers
  const pendingSubmissions = isTeacher
    ? submissions.filter(s => s.grade === null || s.grade === undefined)
    : []
  const gradedSubmissions = isTeacher
    ? submissions.filter(s => s.grade !== null && s.grade !== undefined)
    : submissions.filter(s => s.grade !== null && s.grade !== undefined)

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
                  <BreadcrumbPage>{isTeacher ? "Review Submissions" : "My Submissions"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div>
            <h1 className="text-3xl font-bold">
              {isTeacher ? "Student Submissions" : "My Submissions"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isTeacher ? "Review and grade student work" : "View your submission history and grades"}
            </p>
          </div>

          {isTeacher && pendingSubmissions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Pending Review ({pendingSubmissions.length})
              </h2>
              {pendingSubmissions.map((submission) => (
                <Link key={submission.id} href={`/dashboard/submissions/${submission.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{submission.profiles?.full_name}</CardTitle>
                          <CardDescription>
                            {submission.assignments?.title} • {submission.assignments?.classes?.name}
                          </CardDescription>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-muted-foreground">{submission.assignments?.points} points</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(submission.submitted_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {isTeacher ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Graded ({gradedSubmissions.length})
                </>
              ) : (
                <>
                  All Submissions ({submissions.length})
                </>
              )}
            </h2>

            {(isTeacher ? gradedSubmissions : submissions).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
                  <p className="text-muted-foreground text-center">
                    {isTeacher ? "No graded submissions to display" : "You haven't submitted any assignments yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {(isTeacher ? gradedSubmissions : submissions).map((submission) => (
                  <Link key={submission.id} href={`/dashboard/submissions/${submission.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {isTeacher && (
                              <CardTitle className="text-base">{submission.profiles?.full_name}</CardTitle>
                            )}
                            <CardDescription className={isTeacher ? "" : "text-base font-semibold"}>
                              {submission.assignments?.title}
                            </CardDescription>
                            {!isTeacher && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {submission.assignments?.classes?.name}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {submission.grade !== null && submission.grade !== undefined ? (
                              <>
                                <div className="text-lg font-semibold">
                                  {submission.grade}/{submission.assignments?.points}
                                </div>
                                <div className="text-xs text-muted-foreground">Graded</div>
                              </>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                <Clock className="h-3 w-3" />
                                Pending
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(submission.submitted_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
