import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportWorkspace from '@/components/interview/ReportWorkspace'

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 2. Fetch completed interview scorecard details
  const { data: interview, error: intError } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (intError || !interview) {
    redirect('/dashboard')
  }

  // If the interview is still active, redirect back to the workspace to complete it
  if (interview.status !== 'completed') {
    redirect(`/interview/${id}`)
  }

  // 3. Fetch historical transcript messages
  const { data: messages } = await supabase
    .from('interview_messages')
    .select('*')
    .eq('interview_id', id)
    .order('created_at', { ascending: true })

  return (
    <ReportWorkspace 
      interview={interview} 
      messages={messages || []} 
    />
  )
}
