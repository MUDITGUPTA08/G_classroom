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
import { Users, GraduationCap, BookOpen, FileText, CheckSquare, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface DashboardStats {
  totalUsers: number
  totalStudents: number
  totalTeachers: number
  totalAdmins: number
  totalClasses: number
  totalAssignments: number
  totalSubmissions: number
  gradedSubmissions: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
    totalClasses: 0,
    totalAssignments: 0,
    totalSubmissions: 0,
    gradedSubmissions: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient()

      try {
        // Get user counts by role
        const { data: profiles } = await supabase
          .from('profiles')
          .select('role')

        const totalUsers = profiles?.length || 0
        const totalStudents = profiles?.filter(p => p.role === 'student').length || 0
        const totalTeachers = profiles?.filter(p => p.role === 'teacher').length || 0
        const totalAdmins = profiles?.filter(p => p.role === 'admin').length || 0

        // Get class count
        const { count: classCount } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true })

        // Get assignment count
        const { count: assignmentCount } = await supabase
          .from('assignments')
          .select('*', { count: 'exact', head: true })

        // Get submission count
        const { count: submissionCount } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })

        // Get graded submission count
        const { count: gradedCount } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'graded')

        setStats({
          totalUsers,
          totalStudents,
          totalTeachers,
          totalAdmins,
          totalClasses: classCount || 0,
          totalAssignments: assignmentCount || 0,
          totalSubmissions: submissionCount || 0,
          gradedSubmissions: gradedCount || 0,
        })
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

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
                  <BreadcrumbPage>Admin Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : stats.totalUsers}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalStudents} students, {stats.totalTeachers} teachers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : stats.totalClasses}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all teachers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assignments</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : stats.totalAssignments}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total assignments created
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Submissions</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : stats.totalSubmissions}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.gradedSubmissions} graded
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : stats.totalStudents}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active student accounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Teachers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : stats.totalTeachers}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active teacher accounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : stats.totalAdmins}
                </div>
                <p className="text-xs text-muted-foreground">
                  Admin accounts
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Average submissions per assignment</span>
                  <span className="text-sm font-medium">
                    {stats.totalAssignments > 0
                      ? (stats.totalSubmissions / stats.totalAssignments).toFixed(1)
                      : "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Grading completion rate</span>
                  <span className="text-sm font-medium">
                    {stats.totalSubmissions > 0
                      ? `${((stats.gradedSubmissions / stats.totalSubmissions) * 100).toFixed(1)}%`
                      : "0%"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Average class size</span>
                  <span className="text-sm font-medium">
                    {stats.totalClasses > 0
                      ? (stats.totalStudents / stats.totalClasses).toFixed(1)
                      : "0"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
