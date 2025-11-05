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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { logAuditAction } from "@/lib/supabase/admin-actions"

interface UserForm {
  email: string
  full_name: string
  role: string
  password?: string
}

export default function UserEditPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const isNewUser = userId === "new"

  const [form, setForm] = useState<UserForm>({
    email: "",
    full_name: "",
    role: "student",
    password: "",
  })
  const [loading, setLoading] = useState(!isNewUser)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isNewUser) {
      loadUser()
    }
  }, [userId])

  async function loadUser() {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      setForm({
        email: data.email,
        full_name: data.full_name,
        role: data.role,
      })
    } catch (error) {
      console.error('Error loading user:', error)
      alert('Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()

    try {
      if (isNewUser) {
        // Create new user using Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password || "",
          options: {
            data: {
              full_name: form.full_name,
              role: form.role,
            }
          }
        })

        if (authError) throw authError

        // Update the profile with the role
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: authData.user.id,
              email: form.email,
              full_name: form.full_name,
              role: form.role,
            })

          if (profileError) throw profileError

          // Log the action
          await logAuditAction({
            action: 'create_user',
            resourceType: 'user',
            resourceId: authData.user.id,
            details: { email: form.email, role: form.role }
          })

          alert('User created successfully!')
          router.push('/admin/users')
        }
      } else {
        // Update existing user
        const { error } = await supabase
          .from('profiles')
          .update({
            email: form.email,
            full_name: form.full_name,
            role: form.role,
          })
          .eq('id', userId)

        if (error) throw error

        // Log the action
        await logAuditAction({
          action: 'update_user',
          resourceType: 'user',
          resourceId: userId,
          details: { email: form.email, role: form.role }
        })

        alert('User updated successfully!')
        router.push('/admin/users')
      }
    } catch (error: any) {
      console.error('Error saving user:', error)
      alert(`Failed to save user: ${error.message}`)
    } finally {
      setSaving(false)
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
                  <Link href="/admin/users">Users</Link>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage>{isNewUser ? "New User" : "Edit User"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <Card>
            <CardHeader>
              <CardTitle>{isNewUser ? "Create New User" : "Edit User"}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      disabled={!isNewUser}
                    />
                    {!isNewUser && (
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed for existing users
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isNewUser && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        minLength={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum 6 characters
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : isNewUser ? "Create User" : "Save Changes"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.push('/admin/users')}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
