import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InterviewWorkspace from '@/components/interview/InterviewWorkspace'

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Validate session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 2. Fetch targeted interview details
  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (interviewError || !interview) {
    redirect('/dashboard')
  }

  // If already completed, redirect to report card directly
  if (interview.status === 'completed') {
    redirect(`/interview/${id}/report`)
  }

  // 3. Fetch past messages (chat transcript history)
  const { data: messages } = await supabase
    .from('interview_messages')
    .select('*')
    .eq('interview_id', id)
    .order('created_at', { ascending: true })

  return (
    <InterviewWorkspace 
      interview={interview} 
      initialMessages={messages || []} 
    />
  )
}
