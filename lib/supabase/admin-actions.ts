'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Server action to log admin actions to audit log
 * Can be called from client components
 */
export async function logAuditAction({
  action,
  resourceType,
  resourceId,
  details,
}: {
  action: string
  resourceType: string
  resourceId?: string
  details?: Record<string, any>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  await supabase.from('admin_audit_logs').insert({
    admin_id: user.id,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
  })
}

/**
 * Server action to check if current user is admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
}
