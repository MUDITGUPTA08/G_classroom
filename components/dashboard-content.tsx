"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GraduationCap, FileText, CheckSquare, Users, Plus } from "lucide-react"
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
  })
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

          const [assignmentsResult, submissionsResult] = await Promise.all([
            classIds.length > 0
              ? supabase.from("assignments").select("*", { count: "exact", head: true }).in("class_id", classIds)
              : { count: 0 },
            classIds.length > 0
              ? supabase.from("submissions").select("*", { count: "exact", head: true }).in("assignment_id",
                  await supabase.from("assignments").select("id").in("class_id", classIds).then(r => r.data?.map(a => a.id) || []))
              : { count: 0 },
          ])

          // Calculate total enrollment count
          const totalEnrollments = (allClasses || []).reduce((sum: number, cls: any) => sum + (cls.enrollment_count || 0), 0)

          setStats({
            classes: allClasses?.length || 0,
            assignments: assignmentsResult.count || 0,
            submissions: submissionsResult.count || 0,
            students: totalEnrollments,
          })

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        )}
      </div>

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
