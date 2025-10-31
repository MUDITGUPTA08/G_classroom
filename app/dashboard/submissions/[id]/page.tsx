"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { createClient } from "@/lib/supabase/client"
import type { Tables } from "@/lib/supabase/types"
import { FileList, type FileItem } from "@/components/file-list"

type Profile = Tables<"profiles">

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [grading, setGrading] = useState(false)
  const [grade, setGrade] = useState("")
  const [feedback, setFeedback] = useState("")
  const [submissionFiles, setSubmissionFiles] = useState<FileItem[]>([])
  const [deadlineOverride, setDeadlineOverride] = useState("")

  useEffect(() => {
    loadSubmission()
  }, [id])

  async function loadSubmission() {
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

    // Get submission details
    const { data: submissionData } = await supabase
      .from("submissions")
      .select("*, assignments(title, description, points, classes(name, teacher_id)), profiles(full_name, email)")
      .eq("id", id)
      .single()

    setSubmission(submissionData)
    setGrade(submissionData?.grade?.toString() || "")
    setFeedback(submissionData?.feedback || "")

    // Set deadline override if exists, convert to datetime-local format
    if (submissionData?.deadline_override) {
      const date = new Date(submissionData.deadline_override)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      setDeadlineOverride(`${year}-${month}-${day}T${hours}:${minutes}`)
    }

    // Get submission files
    const { data: filesData } = await supabase
      .from("submission_files")
      .select("*")
      .eq("submission_id", id)
      .order("created_at", { ascending: false })

    setSubmissionFiles(filesData || [])

    setLoading(false)
  }

  async function handleGradeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGrading(true)

    const supabase = createClient()

    const updateData: any = {
      grade: parseInt(grade),
      feedback,
      graded_at: new Date().toISOString(),
      status: "graded",
    }

    // Add deadline override if provided
    if (deadlineOverride) {
      updateData.deadline_override = new Date(deadlineOverride).toISOString()
    }

    const { error } = await supabase
      .from("submissions")
      .update(updateData)
      .eq("id", id)

    if (!error) {
      loadSubmission()
    }

    setGrading(false)
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

  if (!submission) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-lg text-muted-foreground">Submission not found</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const isTeacher = profile?.role === "teacher" && submission.assignments?.classes?.teacher_id === profile.id
  const isStudent = profile?.role === "student" && submission.student_id === profile.id

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
                  <BreadcrumbLink href="/dashboard/submissions">Submissions</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {isTeacher ? submission.profiles?.full_name : submission.assignments?.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6 max-w-4xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{submission.assignments?.title}</h1>
              {submission.is_late && (
                <span className="inline-flex items-center text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                  Late Submission
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {isTeacher ? `Submitted by ${submission.profiles?.full_name}` : submission.assignments?.classes?.name}
            </p>
            {isTeacher && (
              <p className="text-sm text-muted-foreground">{submission.profiles?.email}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Submission Date</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{new Date(submission.submitted_at).toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Points Possible</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{submission.assignments?.points}</p>
              </CardContent>
            </Card>
          </div>

          {submission.assignments?.description && (
            <Card>
              <CardHeader>
                <CardTitle>Assignment Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{submission.assignments.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Student Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Written Submission</h4>
                <p className="whitespace-pre-wrap">{submission.content || "No written content submitted"}</p>
              </div>
              {submissionFiles.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Attached Files</h4>
                  <FileList files={submissionFiles} />
                </div>
              )}
            </CardContent>
          </Card>

          {isTeacher ? (
            <Card>
              <CardHeader>
                <CardTitle>Grade Submission</CardTitle>
                <CardDescription>Provide a grade and feedback for this submission</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGradeSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade (out of {submission.assignments?.points})</Label>
                    <Input
                      id="grade"
                      type="number"
                      min="0"
                      max={submission.assignments?.points}
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      required
                      disabled={grading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback">Feedback</Label>
                    <textarea
                      id="feedback"
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Provide feedback for the student..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      disabled={grading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline-override">Custom Deadline (Optional)</Label>
                    <Input
                      id="deadline-override"
                      type="datetime-local"
                      value={deadlineOverride}
                      onChange={(e) => setDeadlineOverride(e.target.value)}
                      disabled={grading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Override the assignment deadline for this student only. Leave empty to use the original deadline.
                    </p>
                  </div>
                  <Button type="submit" disabled={grading || !grade}>
                    {grading ? "Saving..." : submission.grade !== null && submission.grade !== undefined ? "Update Grade" : "Submit Grade"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            submission.grade !== null && submission.grade !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle>Grade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-4xl font-bold">
                      {submission.grade}/{submission.assignments?.points}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {Math.round((submission.grade / submission.assignments?.points) * 100)}%
                    </p>
                  </div>
                  {submission.feedback && (
                    <div>
                      <h4 className="font-semibold mb-2">Teacher Feedback</h4>
                      <p className="whitespace-pre-wrap text-muted-foreground">{submission.feedback}</p>
                    </div>
                  )}
                  {submission.graded_at && (
                    <p className="text-sm text-muted-foreground">
                      Graded on {new Date(submission.graded_at).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
