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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { TrendingUp, TrendingDown } from "lucide-react"

interface AnalyticsData {
  totalUsers: number
  totalClasses: number
  totalAssignments: number
  totalSubmissions: number
  gradeDistribution: { range: string; count: number }[]
  activityTrend: { period: string; signups: number }[]
  topTeachers: { name: string; classCount: number; studentCount: number }[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    totalUsers: 0,
    totalClasses: 0,
    totalAssignments: 0,
    totalSubmissions: 0,
    gradeDistribution: [],
    activityTrend: [],
    topTeachers: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  async function loadAnalytics() {
    const supabase = createClient()
    try {
      // Get basic counts
      const [
        { count: userCount },
        { count: classCount },
        { count: assignmentCount },
        { count: submissionCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('assignments').select('*', { count: 'exact', head: true }),
        supabase.from('submissions').select('*', { count: 'exact', head: true }),
      ])

      // Get grade distribution
      const { data: submissions } = await supabase
        .from('submissions')
        .select('grade')
        .not('grade', 'is', null)

      const gradeRanges = [
        { range: '0-10%', min: 0, max: 10 },
        { range: '11-20%', min: 11, max: 20 },
        { range: '21-30%', min: 21, max: 30 },
        { range: '31-40%', min: 31, max: 40 },
        { range: '41-50%', min: 41, max: 50 },
        { range: '51-60%', min: 51, max: 60 },
        { range: '61-70%', min: 61, max: 70 },
        { range: '71-80%', min: 71, max: 80 },
        { range: '81-90%', min: 81, max: 90 },
        { range: '91-100%', min: 91, max: 100 },
      ]

      const gradeDistribution = gradeRanges.map((range) => ({
        range: range.range,
        count: submissions?.filter(
          (s) => s.grade >= range.min && s.grade <= range.max
        ).length || 0,
      }))

      // Get top teachers
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'teacher')

      const teachersWithStats = await Promise.all(
        (teachers || []).map(async (teacher) => {
          const { count: classCount } = await supabase
            .from('classes')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', teacher.id)

          const { data: enrollments } = await supabase
            .from('class_enrollments')
            .select('student_id, classes!inner(teacher_id)')
            .eq('classes.teacher_id', teacher.id)

          const studentCount = new Set(enrollments?.map(e => e.student_id) || []).size

          return {
            name: teacher.full_name,
            classCount: classCount || 0,
            studentCount,
          }
        })
      )

      const topTeachers = teachersWithStats
        .sort((a, b) => b.studentCount - a.studentCount)
        .slice(0, 5)

      setData({
        totalUsers: userCount || 0,
        totalClasses: classCount || 0,
        totalAssignments: assignmentCount || 0,
        totalSubmissions: submissionCount || 0,
        gradeDistribution,
        activityTrend: [],
        topTeachers,
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
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
                  <BreadcrumbPage>Analytics</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          {loading ? (
            <div className="text-center py-8">Loading analytics...</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{data.totalUsers}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Total Classes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{data.totalClasses}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Total Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{data.totalAssignments}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Total Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{data.totalSubmissions}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Grade Distribution</CardTitle>
                    <CardDescription>Distribution of grades across all submissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.gradeDistribution.map((item) => (
                        <div key={item.range} className="flex items-center justify-between">
                          <span className="text-sm">{item.range}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${(item.count / Math.max(...data.gradeDistribution.map(d => d.count))) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Teachers</CardTitle>
                    <CardDescription>Teachers with most students</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.topTeachers.map((teacher, index) => (
                        <div key={teacher.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>
                            <div>
                              <p className="font-medium">{teacher.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {teacher.classCount} classes
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{teacher.studentCount}</p>
                            <p className="text-xs text-muted-foreground">students</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Metrics</CardTitle>
                  <CardDescription>Additional system-wide statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Students per Class</p>
                      <p className="text-2xl font-bold">
                        {data.totalClasses > 0
                          ? (data.totalSubmissions / data.totalClasses).toFixed(1)
                          : '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Submissions per Assignment</p>
                      <p className="text-2xl font-bold">
                        {data.totalAssignments > 0
                          ? (data.totalSubmissions / data.totalAssignments).toFixed(1)
                          : '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Assignments per Class</p>
                      <p className="text-2xl font-bold">
                        {data.totalClasses > 0
                          ? (data.totalAssignments / data.totalClasses).toFixed(1)
                          : '0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
