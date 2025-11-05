"use client"

import * as React from "react"
import {
  BookOpen,
  GraduationCap,
  Home,
  FileText,
  CheckSquare,
  Users,
  Settings,
  Plus,
  Shield,
  BarChart3,
  ClipboardList,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"
import type { Tables } from "@/lib/supabase/types"

type Profile = Tables<"profiles">

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [classes, setClasses] = React.useState<any[]>([])

  React.useEffect(() => {
    async function loadUserData() {
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

        // Get classes using RLS-bypassing function
        const { data: classesData } = await supabase
          .rpc('list_my_classes')

        setClasses(classesData || [])
      }
    }

    loadUserData()
  }, [])

  const teacherNav = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "My Classes",
      url: "/dashboard/classes",
      icon: GraduationCap,
      items: classes.slice(0, 5).map((cls) => ({
        title: cls.name,
        url: `/dashboard/classes/${cls.id}`,
      })),
    },
    {
      title: "Assignments",
      url: "/dashboard/assignments",
      icon: FileText,
    },
    {
      title: "Submissions",
      url: "/dashboard/submissions",
      icon: CheckSquare,
    },
    {
      title: "Students",
      url: "/dashboard/students",
      icon: Users,
    },
  ]

  const studentNav = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "My Classes",
      url: "/dashboard/classes",
      icon: GraduationCap,
      items: classes.slice(0, 5).map((cls) => ({
        title: cls.name,
        url: `/dashboard/classes/${cls.id}`,
      })),
    },
    {
      title: "Assignments",
      url: "/dashboard/assignments",
      icon: FileText,
    },
    {
      title: "My Submissions",
      url: "/dashboard/submissions",
      icon: CheckSquare,
    },
  ]

  const adminNav = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Admin Panel",
      url: "/admin",
      icon: Shield,
      items: [
        {
          title: "Users",
          url: "/admin/users",
        },
        {
          title: "Teachers",
          url: "/admin/teachers",
        },
        {
          title: "Students",
          url: "/admin/students",
        },
        {
          title: "Classes",
          url: "/admin/classes",
        },
        {
          title: "Analytics",
          url: "/admin/analytics",
        },
        {
          title: "Audit Logs",
          url: "/admin/audit-logs",
        },
        {
          title: "Settings",
          url: "/admin/settings",
        },
      ],
    },
    {
      title: "All Classes",
      url: "/dashboard/classes",
      icon: GraduationCap,
    },
    {
      title: "All Assignments",
      url: "/dashboard/assignments",
      icon: FileText,
    },
    {
      title: "All Submissions",
      url: "/dashboard/submissions",
      icon: CheckSquare,
    },
  ]

  const navSecondary = [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
  ]

  const navItems =
    profile?.role === "admin" ? adminNav :
    profile?.role === "teacher" ? teacherNav :
    studentNav

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <BookOpen className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Classroom</span>
                  <span className="truncate text-xs capitalize">{profile?.role || "Loading..."}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: profile?.full_name || "User",
          email: profile?.email || "",
          avatar: profile?.avatar_url || "",
          role: profile?.role || "student"
        }} />
      </SidebarFooter>
    </Sidebar>
  )
}
