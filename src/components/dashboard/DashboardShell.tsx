'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  FileText, 
  Settings, 
  LogOut, 
  Plus, 
  TrendingUp, 
  BookOpen, 
  Code,
  CheckCircle,
  Clock,
  ChevronRight,
  GitBranch,
  X,
  Loader2
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

interface DashboardShellProps {
  user: any
  profile: any
  initialInterviews: any[]
}

export default function DashboardShell({ user, profile, initialInterviews }: DashboardShellProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [interviews, setInterviews] = useState<any[]>(initialInterviews)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // New Interview Configuration States
  const [role, setRole] = useState(profile.profile_summary?.targetRole || 'SDE Intern')
  const [difficulty, setDifficulty] = useState(profile.profile_summary?.targetDifficulty || 'medium')
  const [type, setType] = useState('Live PR Critique')
  const [selectedRepoUrl, setSelectedRepoUrl] = useState(
    profile.github_summary?.selectedRepos?.[0]?.url || ''
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/interviews/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          difficulty,
          type,
          repoUrl: selectedRepoUrl,
        }),
      })

      if (!response.ok) {
        throw new Error('Could not initiate interview')
      }

      const data = await response.json()
      router.push(`/interview/${data.interviewId}`)
    } catch (err) {
      console.error(err)
      alert('Failed to initiate interview session.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate readiness indexes based on completed interviews
  const completedSessions = interviews.filter(i => i.status === 'completed')
  const averageScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((acc, curr) => acc + (curr.scorecard?.overall || 0), 0) / completedSessions.length)
    : 0

  // Format historical chart data
  const chartData = [...completedSessions]
    .reverse()
    .map((item, idx) => ({
      name: `Mock #${idx + 1}`,
      score: item.scorecard?.overall || 0,
    }))

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans selection:bg-[#0066FF] selection:text-white">
      {/* Header bar */}
      <header className="border-b border-[#121212] bg-[#0E0E0E] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <svg className="h-6 w-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logoGradDashboard" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0066FF" />
                    <stop offset="100%" stopColor="#00F5FF" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="40" stroke="url(#logoGradDashboard)" strokeWidth="8" strokeLinecap="round" strokeDasharray="180 60" />
                <path d="M50 30 V70" stroke="url(#logoGradDashboard)" strokeWidth="10" strokeLinecap="round" />
                <circle cx="50" cy="18" r="4" fill="#FFFFFF" />
              </svg>

              <span className="font-semibold tracking-tight text-white text-md">Interview OS</span>
            </div>
            <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-neutral-400">
              <span className="text-white border-b-2 border-[#0066FF] pb-4 pt-1 cursor-default">Dashboard</span>
              <button onClick={() => router.push('/dashboard/onboarding')} className="hover:text-white transition-colors pb-4 pt-1 cursor-pointer">Re-sync Profiles</button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-400 hidden sm:inline">{user.email}</span>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-md bg-[#121212] border border-[#1F1F1F] hover:bg-[#1A1A1A] text-neutral-400 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Workspace */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Main Stats and past runs) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Greeting */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Engineering Dashboard</h1>
              <p className="text-xs text-neutral-400">Track preparedness for {profile.profile_summary?.targetRole || 'Software Engineering'} mocks.</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-1.5 py-2 px-4 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-md cursor-pointer transition-colors shadow-lg"
            >
              <Plus className="h-4 w-4" />
              New Mock Interview
            </button>
          </div>

          {/* Core Analytics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Readiness Score</span>
              <p className="text-2xl font-bold text-white">{averageScore > 0 ? `${averageScore}%` : 'N/A'}</p>
              <div className="w-full bg-[#1F1F1F] h-1 rounded-full overflow-hidden">
                <div className="bg-[#0066FF] h-full" style={{ width: `${averageScore}%` }}></div>
              </div>
            </div>

            <div className="p-4 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Mocks Taken</span>
              <p className="text-2xl font-bold text-white">{completedSessions.length}</p>
              <span className="text-[10px] text-neutral-400 block">Total sessions finished</span>
            </div>

            <div className="p-4 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Languages Synced</span>
              <p className="text-2xl font-bold text-white">{profile.github_summary?.selectedRepos?.length || 0}</p>
              <span className="text-[10px] text-neutral-400 block">Active repo linkages</span>
            </div>

            <div className="p-4 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Next Focus</span>
              <p className="text-sm font-semibold text-[#0066FF] truncate pt-1">
                {profile.profile_summary?.skills?.[0] || 'System Design'}
              </p>
              <span className="text-[10px] text-neutral-400 block">Recommended review</span>
            </div>
          </div>

          {/* Trajectory Graph */}
          <div className="p-6 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-[#0066FF]" />
                Performance Trajectory
              </h3>
              <span className="text-[10px] text-neutral-500 font-medium">Readiness Index over time</span>
            </div>
            
            {chartData.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0066FF" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0066FF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                    <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} />
                    <YAxis stroke="#525252" fontSize={10} tickLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#121212', borderColor: '#1F1F1F', color: '#fff', fontSize: '12px' }} 
                      labelStyle={{ color: '#8E8E93' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#0066FF" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 border border-dashed border-[#1F1F1F] rounded-md flex flex-col items-center justify-center text-center p-6 space-y-2">
                <BookOpen className="h-8 w-8 text-neutral-500" />
                <p className="text-xs text-neutral-400">Complete your first session to unlock performance trajectory tracking.</p>
              </div>
            )}
          </div>

          {/* Past Sessions List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Mock Session History</h3>
            {interviews.length > 0 ? (
              <div className="space-y-3">
                {interviews.map((interview) => (
                  <div 
                    key={interview.id} 
                    className="p-4 bg-[#121212] border border-[#1F1F1F] rounded-lg flex items-center justify-between hover:border-[#262626] transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{interview.title}</span>
                        <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${
                          interview.status === 'completed' 
                            ? 'bg-emerald-950/50 border border-emerald-900/50 text-emerald-400' 
                            : 'bg-amber-950/50 border border-amber-900/50 text-amber-400'
                        }`}>
                          {interview.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                        <span className="flex items-center gap-1"><Code className="h-3 w-3" /> {interview.type}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(interview.created_at).toLocaleDateString()}</span>
                        <span className="capitalize">({interview.difficulty})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {interview.status === 'completed' && interview.scorecard?.overall && (
                        <span className="text-sm font-bold text-white">{interview.scorecard.overall}%</span>
                      )}
                      <button
                        onClick={() => {
                          if (interview.status === 'completed') {
                            router.push(`/interview/${interview.id}/report`)
                          } else {
                            router.push(`/interview/${interview.id}`)
                          }
                        }}
                        className="p-1.5 rounded bg-[#1C1C1E] border border-[#262626] hover:bg-[#262626] text-neutral-400 hover:text-white cursor-pointer transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center border border-dashed border-[#1F1F1F] rounded-lg flex flex-col items-center justify-center space-y-3">
                <Play className="h-6 w-6 text-neutral-500" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-white">No Mock Interviews Created</p>
                  <p className="text-[10px] text-neutral-400">Initialize a mock interview below or click "New Mock Interview" to begin.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (Resume Summary Details & Skill Matrix) */}
        <div className="space-y-8">
          {/* Profile Card */}
          <div className="p-6 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-4">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Active Profile Metadata</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0066FF]" />
                <span className="text-xs text-white truncate max-w-[200px]" title={profile.profile_summary?.resumeName}>
                  {profile.profile_summary?.resumeName || 'resume.pdf'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-[#0066FF]" />
                <span className="text-xs text-white truncate">
                  github.com/{profile.github_summary?.username || 'linked'}
                </span>
              </div>
            </div>

            <div className="border-t border-[#1F1F1F] pt-4 space-y-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Profile Abstract</span>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                {profile.profile_summary?.summary}
              </p>
            </div>
          </div>

          {/* Skill Checklist */}
          <div className="p-6 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-4">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Identified Tech Focus</h3>
            <div className="flex flex-wrap gap-2">
              {profile.profile_summary?.skills?.map((skill: string) => (
                <span 
                  key={skill}
                  className="text-[10px] text-white bg-[#1A1A1A] border border-[#262626] px-2.5 py-1 rounded-md flex items-center gap-1"
                >
                  <CheckCircle className="h-3 w-3 text-[#0066FF]" />
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* START INTERVIEW MODAL POPUP */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md bg-[#121212] border border-[#1F1F1F] rounded-xl shadow-2xl z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#1F1F1F]">
                <h3 className="text-sm font-semibold text-white">Create New Session</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded hover:bg-[#1A1A1A] text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleStartInterview} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Target Track</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full py-1.5 px-3 bg-[#0A0A0A] border border-[#262626] text-white text-xs rounded-md focus:outline-none focus:border-[#0066FF]"
                  >
                    <option value="SDE Intern">SDE Intern</option>
                    <option value="Software Engineer">Software Engineer</option>
                    <option value="Backend Engineer">Backend Engineer</option>
                    <option value="Frontend Engineer">Frontend Engineer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Mock Focus</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full py-1.5 px-3 bg-[#0A0A0A] border border-[#262626] text-white text-xs rounded-md focus:outline-none focus:border-[#0066FF]"
                  >
                    <option value="Live PR Critique">Live PR Critique (Repo Review)</option>
                    <option value="CS Fundamentals & System Design">CS Fundamentals & System Design</option>

                    <option value="DSA Sandbox">Coding Challenge (DSA)</option>
                    <option value="Resume Grill">Resume & Projects Mock</option>
                  </select>
                </div>

                {type === 'Live PR Critique' && profile.github_summary?.selectedRepos?.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Target Repository</label>
                    <select 
                      value={selectedRepoUrl}
                      onChange={(e) => setSelectedRepoUrl(e.target.value)}
                      className="w-full py-1.5 px-3 bg-[#0A0A0A] border border-[#262626] text-white text-xs rounded-md focus:outline-none focus:border-[#0066FF]"
                    >
                      {profile.github_summary.selectedRepos.map((repo: any) => (
                        <option key={repo.url} value={repo.url}>{repo.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Difficulty Level</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['easy', 'medium', 'hard', 'faang'].map((level) => (
                      <button
                        type="button"
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`py-1.5 rounded text-center text-[10px] font-bold capitalize cursor-pointer transition-all ${
                          difficulty === level 
                            ? 'border border-[#0066FF] bg-[#0066FF]/5 text-white' 
                            : 'border border-[#262626] bg-[#0A0A0A] text-neutral-400 hover:border-[#404040]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1F1F1F] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="py-1.5 px-4 bg-[#121212] border border-[#1F1F1F] text-neutral-400 hover:text-white text-xs font-semibold rounded-md cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-1.5 py-1.5 px-5 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-md cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Initialize OS
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
