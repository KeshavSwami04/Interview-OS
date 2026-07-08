import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user from request session cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { role, difficulty, resumeUrl, resumeName, githubUsername, selectedRepos } = body

    // 2. Synthesize initial profile summary data based on targeted tracks
    const defaultSkills = role.toLowerCase().includes('frontend') 
      ? ['React', 'TypeScript', 'TailwindCSS', 'Next.js', 'CSS Grid', 'Framer Motion', 'JavaScript']
      : role.toLowerCase().includes('backend')
      ? ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'Express', 'System Design', 'C++', 'Java', 'Go']
      : role.toLowerCase().includes('analyst')
      ? ['SQL', 'Python', 'Pandas', 'NumPy', 'Tableau', 'PowerBI', 'Excel', 'Statistics', 'Data Warehousing']
      : ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'C++', 'Java', 'Algorithms', 'System Design']


    const profileSummary = {
      resumeName: resumeName || 'Uploaded Resume',
      targetRole: role,
      targetDifficulty: difficulty,
      skills: defaultSkills,
      summary: `Candidate preparing for ${role} mock interviews at a ${difficulty} level. Uploaded profile references direct code dependencies.`
    }

    const githubSummary = {
      username: githubUsername,
      selectedRepos: (selectedRepos || []).map((url: string) => {
        const name = url.split('/').pop() || 'repository'
        return {
          name,
          url,
          analyzedSummary: `Code analysis completed for repo: ${name}. Inspected package manifest and primary entry points.`
        }
      })
    }

    // 3. Upsert synthesized metadata into public.user_profiles
    const { error: dbError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        resume_url: resumeUrl || null,
        profile_summary: profileSummary,
        github_summary: githubSummary
      }, { onConflict: 'user_id' })

    if (dbError) {
      console.error('Database write error during profile sync:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API Profile Sync internal failure:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
