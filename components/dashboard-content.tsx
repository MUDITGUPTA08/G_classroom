"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GraduationCap, FileText, CheckSquare, Users, Plus, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react"
import Link from "next/link"
import type { Tables } from "@/lib/supabase/types"

type Profile = Tables<"profiles">

export function DashboardContent() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({
    classes: 0,
    assignments: 0,
    submissions: 0,
    students: 0,
    averageScore: 0,
  })
  const [gradeDistribution, setGradeDistribution] = useState<any[]>([])
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([])
  const [recentClasses, setRecentClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Get profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        setProfile(profileData)

        if (profileData?.role === "teacher") {
          // Get recent classes using RLS-bypassing function
          const { data: allClasses } = await supabase.rpc('list_my_classes')
          const recentClassesData = (allClasses || []).slice(0, 3)

          // Get assignment count for teacher's classes
          const classIds = (allClasses || []).map((c: any) => c.id)

          // Get assignment IDs for teacher's classes
          const assignmentIds = classIds.length > 0
            ? await supabase.from("assignments").select("id").in("class_id", classIds).then(r => r.data?.map(a => a.id) || [])
            : []

          const [assignmentsResult, submissionsResult] = await Promise.all([
            classIds.length > 0
              ? supabase.from("assignments").select("*", { count: "exact", head: true }).in("class_id", classIds)
              : { count: 0 },
            assignmentIds.length > 0
              ? supabase.from("submissions").select("*", { count: "exact", head: true })
                  .in("assignment_id", assignmentIds)
                  .is("grade", null)  // Only count ungraded submissions
              : { count: 0 },
          ])

          // Calculate total enrollment count
          const totalEnrollments = (allClasses || []).reduce((sum: number, cls: any) => sum + (cls.enrollment_count || 0), 0)

          // Calculate average score and grade distribution
          let averageScore = 0
          const gradeDistData: any[] = []

          if (assignmentIds.length > 0) {
            // Get all graded submissions
            const { data: gradedSubmissions } = await supabase
              .from("submissions")
              .select("grade, assignments!inner(points)")
              .in("assignment_id", assignmentIds)
              .not("grade", "is", null)

            if (gradedSubmissions && gradedSubmissions.length > 0) {
              // Calculate average percentage score
              const percentages = gradedSubmissions.map((sub: any) =>
                (sub.grade / sub.assignments.points) * 100
              )
              averageScore = percentages.reduce((a: number, b: number) => a + b, 0) / percentages.length

              // Calculate grade distribution (0-10, 11-20, ..., 91-100)
              const ranges = [
                { label: "0-10%", min: 0, max: 10, count: 0 },
                { label: "11-20%", min: 11, max: 20, count: 0 },
                { label: "21-30%", min: 21, max: 30, count: 0 },
                { label: "31-40%", min: 31, max: 40, count: 0 },
                { label: "41-50%", min: 41, max: 50, count: 0 },
                { label: "51-60%", min: 51, max: 60, count: 0 },
                { label: "61-70%", min: 61, max: 70, count: 0 },
                { label: "71-80%", min: 71, max: 80, count: 0 },
                { label: "81-90%", min: 81, max: 90, count: 0 },
                { label: "91-100%", min: 91, max: 100, count: 0 },
              ]

              percentages.forEach((pct: number) => {
                const range = ranges.find(r => pct >= r.min && pct <= r.max)
                if (range) range.count++
              })

              gradeDistData.push(...ranges.filter(r => r.count > 0))
            }
          }

          // Find at-risk students (3+ missing submissions)
          const atRiskData: any[] = []
          if (assignmentIds.length > 0 && classIds.length > 0) {
            // Get all enrollments
            const { data: enrollments } = await supabase
              .from("class_enrollments")
              .select("student_id, profiles!inner(full_name, email)")
              .in("class_id", classIds)

            if (enrollments && enrollments.length > 0) {
              // For each student, count missing submissions
              for (const enrollment of enrollments) {
                const studentId = enrollment.student_id
                const profile = enrollment.profiles as any

                // Get assignments for classes the student is enrolled in
                const { data: studentClassIds } = await supabase
                  .from("class_enrollments")
                  .select("class_id")
                  .eq("student_id", studentId)

                const studentAssignmentIds = studentClassIds && studentClassIds.length > 0
                  ? await supabase
                      .from("assignments")
                      .select("id")
                      .in("class_id", studentClassIds.map((c: any) => c.class_id))
                      .then(r => r.data?.map(a => a.id) || [])
                  : []

                if (studentAssignmentIds.length > 0) {
                  // Count submissions
                  const { count: submissionCount } = await supabase
                    .from("submissions")
                    .select("*", { count: "exact", head: true })
                    .eq("student_id", studentId)
                    .in("assignment_id", studentAssignmentIds)

                  const missingCount = studentAssignmentIds.length - (submissionCount || 0)

                  if (missingCount >= 3) {
                    atRiskData.push({
                      name: profile.full_name,
                      email: profile.email,
                      missingCount,
                    })
                  }
                }
              }
            }
          }

          setStats({
            classes: allClasses?.length || 0,
            assignments: assignmentsResult.count || 0,
            submissions: submissionsResult.count || 0,
            students: totalEnrollments,
            averageScore: Math.round(averageScore),
          })

          setGradeDistribution(gradeDistData)
          setAtRiskStudents(atRiskData)
          setRecentClasses(recentClassesData)
        } else if (profileData?.role === "student") {
          // Get student stats using RLS-bypassing function
          const { data: allClasses } = await supabase.rpc('list_my_classes')
          const recentClassesData = (allClasses || []).slice(0, 3)

          const classIds = (allClasses || []).map((c: any) => c.id)

          const [assignmentsResult, submissionsResult] = await Promise.all([
            classIds.length > 0
              ? supabase.from("assignments").select("*", { count: "exact", head: true }).in("class_id", classIds)
              : { count: 0 },
            supabase.from("submissions").select("*", { count: "exact", head: true }).eq("student_id", user.id),
          ])

          setStats({
            classes: allClasses?.length || 0,
            assignments: assignmentsResult.count || 0,
            submissions: submissionsResult.count || 0,
            students: 0,
            averageScore: 0,
          })

          setRecentClasses(recentClassesData)
        }
      }

      setLoading(false)
    }

    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const isTeacher = profile?.role === "teacher"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name}!</h1>
          <p className="text-muted-foreground mt-1">
            {isTeacher ? "Manage your classes and assignments" : "View your classes and assignments"}
          </p>
        </div>
        {isTeacher && (
          <Link href="/dashboard/classes/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Class
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isTeacher ? "My Classes" : "Enrolled Classes"}
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.classes}</div>
            <p className="text-xs text-muted-foreground">
              {isTeacher ? "Total classes you teach" : "Total classes enrolled"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignments}</div>
            <p className="text-xs text-muted-foreground">
              {isTeacher ? "Total assignments created" : "Total assignments available"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isTeacher ? "Pending Reviews" : "My Submissions"}
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.submissions}</div>
            <p className="text-xs text-muted-foreground">
              {isTeacher ? "Submissions to review" : "Total submissions made"}
            </p>
          </CardContent>
        </Card>

        {isTeacher && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.students}</div>
                <p className="text-xs text-muted-foreground">
                  Students across all classes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageScore}%</div>
                <p className="text-xs text-muted-foreground">
                  Across all graded work
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {isTeacher && gradeDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Grade Distribution</CardTitle>
            </div>
            <CardDescription>Score ranges across all graded assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gradeDistribution.map((range) => (
                <div key={range.label} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium">{range.label}</div>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-primary h-full flex items-center justify-end px-2 text-xs text-primary-foreground font-medium transition-all"
                      style={{
                        width: `${(range.count / gradeDistribution.reduce((sum, r) => sum + r.count, 0)) * 100}%`,
                        minWidth: range.count > 0 ? '30px' : '0'
                      }}
                    >
                      {range.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isTeacher && atRiskStudents.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-yellow-900">At-Risk Students</CardTitle>
            </div>
            <CardDescription className="text-yellow-700">
              Students with 3 or more missing submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {atRiskStudents.map((student, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200">
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                      {student.missingCount} missing
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Classes</CardTitle>
          <CardDescription>
            {isTeacher ? "Your most recently created classes" : "Your most recently enrolled classes"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentClasses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              {isTeacher ? (
                <>
                  <p>No classes yet.</p>
                  <Link href="/dashboard/classes/new">
                    <Button className="mt-4" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Class
                    </Button>
                  </Link>
                </>
              ) : (
                <p>No classes enrolled yet. Ask your teacher for a class code.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {recentClasses.map((cls) => (
                <Link key={cls.id} href={`/dashboard/classes/${cls.id}`}>
                  <div className="flex items-center justify-between p-3 mb-2 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <h3 className="font-medium">{cls.name}</h3>
                      <p className="text-sm text-muted-foreground">{cls.subject || "No subject"}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {cls.class_code}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
