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
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { FileText, Users, Clock, CheckCircle2, Pencil, Trash2 } from "lucide-react"
import type { Tables } from "@/lib/supabase/types"
import { FileUpload } from "@/components/file-upload"
import { FileList, type FileItem } from "@/components/file-list"

type Profile = Tables<"profiles">

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [assignment, setAssignment] = useState<any>(null)
  const [classData, setClassData] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [content, setContent] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [submissionFiles, setSubmissionFiles] = useState<FileItem[]>([])
  const [assignmentAttachments, setAssignmentAttachments] = useState<FileItem[]>([])

  useEffect(() => {
    loadAssignmentData()
  }, [id])

  async function loadAssignmentData() {
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

    // Get assignment details
    const { data: assignmentData } = await supabase
      .from("assignments")
      .select("*, classes(name, teacher_id, allow_late_submissions)")
      .eq("id", id)
      .single()

    setAssignment(assignmentData)

    if (assignmentData) {
      setClassData(assignmentData.classes)

      // Get assignment attachments
      const { data: attachmentsData } = await supabase
        .from("assignment_attachments")
        .select("*")
        .eq("assignment_id", id)
        .order("created_at", { ascending: false })

      setAssignmentAttachments(attachmentsData || [])

      if (profileData?.role === "student") {
        // Get student's submission
        const { data: submissionData } = await supabase
          .from("submissions")
          .select("*")
          .eq("assignment_id", id)
          .eq("student_id", user.id)
          .single()

        setSubmission(submissionData)
        setContent(submissionData?.content || "")

        // Get submission files if submission exists
        if (submissionData) {
          const { data: filesData } = await supabase
            .from("submission_files")
            .select("*")
            .eq("submission_id", submissionData.id)
            .order("created_at", { ascending: false })

          setSubmissionFiles(filesData || [])
        }
      } else if (profileData?.role === "teacher") {
        // Get all submissions for this assignment
        const { data: submissionsData } = await supabase
          .from("submissions")
          .select("*, profiles(full_name, email)")
          .eq("assignment_id", id)
          .order("submitted_at", { ascending: false })

        setSubmissions(submissionsData || [])
      }
    }

    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Check if submission is late
      const now = new Date()
      const effectiveDueDate = submission?.deadline_override
        ? new Date(submission.deadline_override)
        : assignment.due_date
          ? new Date(assignment.due_date)
          : null

      const isLate = effectiveDueDate ? now > effectiveDueDate : false

      // Get class settings to check if late submissions are allowed
      const { data: classSettings } = await supabase
        .from("classes")
        .select("allow_late_submissions")
        .eq("id", assignment.class_id)
        .single()

      // Block submission if it's late and class doesn't allow late submissions
      if (isLate && classSettings && !classSettings.allow_late_submissions) {
        alert("This assignment is past due and no longer accepts submissions.")
        setSubmitting(false)
        return
      }

      let submissionId = submission?.id

      if (submission) {
        // Update existing submission
        await supabase
          .from("submissions")
          .update({
            content,
            status: "submitted",
            submitted_at: new Date().toISOString(),
            is_late: isLate,
          })
          .eq("id", submission.id)
      } else {
        // Create new submission
        const { data, error } = await supabase
          .from("submissions")
          .insert({
            assignment_id: id,
            student_id: user.id,
            content,
            status: "submitted",
            is_late: isLate,
          })
          .select()
          .single()

        if (error) throw error
        submissionId = data.id
      }

      // Upload files to storage
      if (selectedFiles.length > 0 && submissionId) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split(".").pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const storageFilePath = `${submissionId}/${fileName}`
          const fullFilePath = `assignment-submissions/${storageFilePath}`

          const { error: uploadError } = await supabase.storage
            .from("assignment-submissions")
            .upload(storageFilePath, file)

          if (uploadError) {
            console.error("Error uploading file:", uploadError)
            continue
          }

          // Save file metadata with full path (includes bucket name)
          await supabase.from("submission_files").insert({
            submission_id: submissionId,
            file_name: file.name,
            file_path: fullFilePath,
            file_size: file.size,
            file_type: file.type,
          })
        }
      }

      setSelectedFiles([])
      await loadAssignmentData()
    } catch (error) {
      console.error("Error submitting assignment:", error)
      alert("Failed to submit assignment")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSubmissionFile = async (fileId: string) => {
    const supabase = createClient()
    const file = submissionFiles.find((f) => f.id === fileId)
    if (!file) return

    // Extract the storage path (remove bucket name from full path)
    const storageFilePath = file.file_path.split("/").slice(1).join("/")

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("assignment-submissions")
      .remove([storageFilePath])

    if (storageError) throw storageError

    // Delete metadata
    const { error: dbError } = await supabase
      .from("submission_files")
      .delete()
      .eq("id", fileId)

    if (dbError) throw dbError

    await loadAssignmentData()
  }

  async function handleDeleteAssignment() {
    if (!confirm(`Are you sure you want to delete the assignment "${assignment.title}"? This will also delete all submissions. This action cannot be undone.`)) {
      return
    }

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", id)

      if (error) throw error

      router.push("/dashboard/assignments")
    } catch (error) {
      console.error("Error deleting assignment:", error)
      alert("Failed to delete assignment")
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

  if (!assignment) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-lg text-muted-foreground">Assignment not found</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const isTeacher = profile?.role === "teacher" && classData?.teacher_id === profile.id
  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date()

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
                  <BreadcrumbPage>{assignment.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{assignment.title}</h1>
              <p className="text-muted-foreground mt-1">{classData?.name || "Unknown Class"}</p>
            </div>
            <div className="flex items-start gap-4">
              {isTeacher && (
                <div className="flex gap-2">
                  <Link href={`/dashboard/assignments/${id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={handleDeleteAssignment}>
                    <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                    Delete
                  </Button>
                </div>
              )}
              <div className="text-right">
                <div className="text-2xl font-bold">{assignment.points} points</div>
                {assignment.due_date && (
                  <div className={`text-sm ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                    Due: {new Date(assignment.due_date).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {assignment.description && (
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{assignment.description}</p>
              </CardContent>
            </Card>
          )}

          {assignmentAttachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Assignment Materials</CardTitle>
                <CardDescription>Files provided by your teacher</CardDescription>
              </CardHeader>
              <CardContent>
                <FileList files={assignmentAttachments} />
              </CardContent>
            </Card>
          )}

          {isTeacher ? (
            <Tabs defaultValue="submissions" className="w-full">
              <TabsList>
                <TabsTrigger value="submissions">
                  <Users className="h-4 w-4 mr-2" />
                  Submissions ({submissions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="submissions" className="space-y-4">
                {submissions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
                      <p className="text-muted-foreground text-center">
                        Students haven't submitted their work yet
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((sub) => (
                      <Link key={sub.id} href={`/dashboard/submissions/${sub.id}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base">{sub.profiles?.full_name}</CardTitle>
                                  {sub.is_late && (
                                    <span className="inline-flex items-center text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                      Late
                                    </span>
                                  )}
                                </div>
                                <CardDescription>{sub.profiles?.email}</CardDescription>
                              </div>
                              <div className="text-right">
                                {sub.grade !== null && sub.grade !== undefined ? (
                                  <div className="text-lg font-semibold">{sub.grade}/{assignment.points}</div>
                                ) : (
                                  <div className="text-sm text-muted-foreground">Not graded</div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  {new Date(sub.submitted_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Your Submission</CardTitle>
                  {submission && (
                    <div className="flex items-center gap-2">
                      {submission.grade !== null && submission.grade !== undefined ? (
                        <span className="text-lg font-semibold">{submission.grade}/{assignment.points}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          <Clock className="h-3 w-3" />
                          Pending Review
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {submission?.is_late && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-1 text-yellow-800">Late Submission</h4>
                      <p className="text-sm text-yellow-700">This submission was marked as late.</p>
                    </div>
                  )}
                  {isOverdue && !submission && classData && !classData.allow_late_submissions && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-1 text-red-800">Assignment Closed</h4>
                      <p className="text-sm text-red-700">This assignment is past due and no longer accepts submissions.</p>
                    </div>
                  )}
                  {isOverdue && !submission && classData && classData.allow_late_submissions && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-1 text-yellow-800">Past Due Date</h4>
                      <p className="text-sm text-yellow-700">This assignment is past due. Your submission will be marked as late.</p>
                    </div>
                  )}
                  {submission?.deadline_override && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-1">Custom Deadline</h4>
                      <p className="text-sm">Your teacher has set a custom deadline: {new Date(submission.deadline_override).toLocaleString()}</p>
                    </div>
                  )}
                  {submission?.feedback && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Teacher Feedback</h4>
                      <p className="text-sm whitespace-pre-wrap">{submission.feedback}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="content">Your Work</Label>
                    <textarea
                      id="content"
                      className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Type your submission here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      disabled={submitting || (submission?.grade !== null && submission?.grade !== undefined)}
                    />
                  </div>

                  {submissionFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label>Submitted Files</Label>
                      <FileList
                        files={submissionFiles}
                        onDelete={handleDeleteSubmissionFile}
                        canDelete={submission?.grade === null || submission?.grade === undefined}
                      />
                    </div>
                  )}

                  {(submission?.grade === null || submission?.grade === undefined) && (
                    <div className="space-y-2">
                      <Label>Attach Files (Optional)</Label>
                      <FileUpload
                        onFilesSelected={setSelectedFiles}
                        maxFiles={5}
                        maxSizeMB={10}
                        disabled={submitting}
                      />
                    </div>
                  )}

                  {submission?.grade === null || submission?.grade === undefined ? (
                    <Button type="submit" disabled={submitting || (!content && selectedFiles.length === 0)}>
                      {submitting ? "Submitting..." : submission ? "Update Submission" : "Submit"}
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">This assignment has been graded and can no longer be edited.</p>
                  )}
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
