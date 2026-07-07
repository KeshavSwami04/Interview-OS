import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Authenticate session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 2. Fetch candidate profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // If no profile exists, guide user to complete onboarding wizard
  if (profileError || !profile) {
    redirect('/dashboard/onboarding')
  }

  // 3. Fetch past mocks/interviews taken by the user
  const { data: interviews } = await supabase
    .from('interviews')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <DashboardShell 
      user={user} 
      profile={profile} 
      initialInterviews={interviews || []} 
    />
  )
}
