"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GraduationCap, Plus, Users } from "lucide-react"
import Link from "next/link"
import type { Tables } from "@/lib/supabase/types"

type Profile = Tables<"profiles">

export function ClassesContent() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState("")
  const [joiningClass, setJoiningClass] = useState(false)
  const [joinError, setJoinError] = useState("")

  useEffect(() => {
    loadClasses()
  }, [])

  async function loadClasses() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      setProfile(profileData)

      // Use the RLS-bypassing function to list classes
      const { data: classesData, error } = await supabase
        .rpc('list_my_classes')

      if (error) {
        console.error("Error loading classes:", error)
      } else {
        setClasses(classesData || [])
      }
    }

    setLoading(false)
  }

  async function handleJoinClass(e: React.FormEvent) {
    e.preventDefault()
    setJoinError("")
    setJoiningClass(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setJoinError("You must be logged in to join a class")
      setJoiningClass(false)
      return
    }

    // Find class by code
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("*")
      .eq("class_code", joinCode.toUpperCase())
      .single()

    if (classError || !classData) {
      setJoinError("Invalid class code")
      setJoiningClass(false)
      return
    }

    // Enroll student
    const { error: enrollError } = await supabase
      .from("class_enrollments")
      .insert({
        class_id: classData.id,
        student_id: user.id,
      })

    if (enrollError) {
      if (enrollError.code === "23505") {
        setJoinError("You are already enrolled in this class")
      } else {
        setJoinError("Failed to join class")
      }
    } else {
      setJoinCode("")
      loadClasses()
    }

    setJoiningClass(false)
  }

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
          <h1 className="text-3xl font-bold">
            {isTeacher ? "My Classes" : "Enrolled Classes"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isTeacher ? "Manage your classes and students" : "View your enrolled classes"}
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

      {!isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle>Join a Class</CardTitle>
            <CardDescription>Enter the class code provided by your teacher</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinClass} className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter class code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  disabled={joiningClass}
                  className="uppercase"
                />
                {joinError && (
                  <p className="text-sm text-destructive mt-2">{joinError}</p>
                )}
              </div>
              <Button type="submit" disabled={joiningClass || !joinCode}>
                {joiningClass ? "Joining..." : "Join Class"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No classes yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              {isTeacher
                ? "Create your first class to get started"
                : "Join a class using the class code from your teacher"}
            </p>
            {isTeacher && (
              <Link href="/dashboard/classes/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Class
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/dashboard/classes/${cls.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <GraduationCap className="h-8 w-8 text-primary" />
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {cls.class_code}
                    </span>
                  </div>
                  <CardTitle className="mt-4">{cls.name}</CardTitle>
                  <CardDescription>{cls.subject || "No subject"}</CardDescription>
                </CardHeader>
                <CardContent>
                  {cls.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {cls.description}
                    </p>
                  )}
                  {isTeacher && cls.enrollment_count !== undefined && (
                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{cls.enrollment_count} students</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
