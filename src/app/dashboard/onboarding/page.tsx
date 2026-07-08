'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Briefcase, 
  Upload, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  FileText, 
  Loader2, 
  Search,
  Check
} from 'lucide-react'


type Step = 'role' | 'resume' | 'github' | 'processing'

interface Repo {
  id: number
  name: string
  html_url: string
  description: string | null
  language: string | null
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  // Onboarding States
  const [currentStep, setCurrentStep] = useState<Step>('role')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Step 1: Role Configuration
  const [selectedRole, setSelectedRole] = useState('SDE Intern')
  const [difficulty, setDifficulty] = useState('medium')

  // Step 2: Resume Upload
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Step 3: Github Sync
  const [githubUsername, setGithubUsername] = useState('')
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  const [searchingRepos, setSearchingRepos] = useState(false)
  const [repoSearchError, setRepoSearchError] = useState<string | null>(null)

  // Status messages
  const [statusMessage, setStatusMessage] = useState('Initializing profile...')

  useEffect(() => {
    async function getSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        // Set GitHub username default if logged in with Github
        const githubIdentity = user.identities?.find((id: any) => id.provider === 'github')
        if (githubIdentity) {
          // Attempt to extract nickname
          const nickname = githubIdentity.identity_data?.user_name || ''
          setGithubUsername(nickname)
        }
      }
    }
    getSession()
  }, [router, supabase])

  // Fetch repositories from public GitHub API
  const fetchGitHubRepos = async () => {
    if (!githubUsername.trim()) return
    setSearchingRepos(true)
    setRepoSearchError(null)
    try {
      const res = await fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=15`)
      if (!res.ok) {
        throw new Error('User not found or API limit exceeded')
      }
      const data = await res.json()
      setRepos(data)
    } catch (err: any) {
      setRepoSearchError(err.message || 'Failed to retrieve repositories.')
    } finally {
      setSearchingRepos(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf') {
        setResumeFile(file)
      } else {
        alert('Please upload a PDF document.')
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === 'application/pdf') {
        setResumeFile(file)
      } else {
        alert('Please upload a PDF document.')
      }
    }
  }

  const toggleRepoSelection = (repoUrl: string) => {
    setSelectedRepos(prev => 
      prev.includes(repoUrl) 
        ? prev.filter(url => url !== repoUrl) 
        : [...prev, repoUrl]
    )
  }

  // Complete Onboarding & call Server Profile analyzer
  const handleCompleteOnboarding = async () => {
    if (!user) return
    setCurrentStep('processing')
    setLoading(true)

    try {
      let resumeUrl = ''

      // 1. Upload resume to Supabase storage if file was provided
      if (resumeFile) {
        setStatusMessage('Uploading resume to storage bucket...')
        const fileExt = resumeFile.name.split('.').pop()
        const filePath = `${user.id}/${Math.random()}.${fileExt}`

        // Create standard public bucket check/upload
        const { error: uploadError } = await supabase.storage
          .from('Resume')
          .upload(filePath, resumeFile, { upsert: true })

        if (uploadError) {
          // If Resume bucket is not created, we skip actual storage upload
          // and store file details locally for mock evaluation context
          console.warn('Supabase bucket Resume not configured yet. Skipping storage upload.')
        } else {
          const { data } = supabase.storage.from('Resume').getPublicUrl(filePath)
          resumeUrl = data.publicUrl
        }

      }

      // 2. Mock / Call API route to build profile context.
      setStatusMessage('Analyzing profile and selected codebases...')
      
      const response = await fetch('/api/profile/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
          difficulty,
          resumeUrl,
          resumeName: resumeFile?.name || 'resume.pdf',
          githubUsername,
          selectedRepos,
        }),
      })

      if (!response.ok) {
        throw new Error('Onboarding analysis failed')
      }

      setStatusMessage('Generating readiness scorecard dashboard...')
      await new Promise(resolve => setTimeout(resolve, 1500))

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Onboarding failed. Proceeding to Dashboard as fallback.')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      {/* Sidebar Onboarding Progress */}
      <div className="hidden md:flex flex-col w-80 border-r border-[#1F1F1F] bg-[#0E0E0E] p-8 space-y-8">
        <div className="flex items-center gap-2">
          <svg className="h-6 w-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="7" fill="#111111"/>
            <path d="M7 11L13 16L7 21" stroke="url(#lgO1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="16" y="19.5" width="9" height="2.5" rx="1.25" fill="url(#lgO2)"/>
            <defs>
              <linearGradient id="lgO1" x1="7" y1="11" x2="13" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#0066FF"/><stop offset="1" stopColor="#00DDFF"/></linearGradient>
              <linearGradient id="lgO2" x1="16" y1="20" x2="25" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#0066FF"/><stop offset="1" stopColor="#00DDFF"/></linearGradient>
            </defs>
          </svg>


          <span className="font-semibold tracking-tight text-white">Interview OS</span>
        </div>

        <div className="flex-1 space-y-6 pt-10">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-semibold ${
              currentStep === 'role' ? 'border-[#0066FF] bg-[#0066FF]/10 text-[#0066FF]' : 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
            }`}>
              {currentStep !== 'role' ? <Check className="h-4 w-4" /> : '1'}
            </div>

            <div>
              <p className="text-sm font-medium text-white">Target Role</p>
              <p className="text-xs text-neutral-500">Configure target track</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-semibold ${
              currentStep === 'resume' ? 'border-[#0066FF] bg-[#0066FF]/10 text-[#0066FF]' : 
              (currentStep === 'github' || currentStep === 'processing' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-[#262626] text-neutral-500')
            }`}>
              {currentStep === 'github' || currentStep === 'processing' ? <Check className="h-4 w-4" /> : '2'}
            </div>
            <div>
              <p className="text-sm font-medium text-white">Upload Resume</p>
              <p className="text-xs text-neutral-500">Extract profile skills</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-semibold ${
              currentStep === 'github' ? 'border-[#0066FF] bg-[#0066FF]/10 text-[#0066FF]' : 
              (currentStep === 'processing' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-[#262626] text-neutral-500')
            }`}>
              {currentStep === 'processing' ? <Check className="h-4 w-4" /> : '3'}
            </div>
            <div>
              <p className="text-sm font-medium text-white">Link Github</p>
              <p className="text-xs text-neutral-500">Import code projects</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-neutral-500">
          Step-by-step context synthesis setup.
        </div>
      </div>

      {/* Main wizard interface */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12">
        <AnimatePresence mode="wait">
          {/* STEP 1: ROLE CONFIGURATION */}
          {currentStep === 'role' && (
            <motion.div 
              key="role"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl space-y-8"
            >
              <div className="space-y-2 text-center md:text-left">
                <span className="text-xs font-semibold text-[#0066FF] uppercase tracking-wider">Step 1 of 3</span>
                <h1 className="text-3xl font-bold tracking-tight text-white">Choose your track</h1>
                <p className="text-neutral-400 text-sm">Configure your target role and complexity tier to customize your adaptive mocks.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Target Job Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['SDE', 'Backend Developer', 'Frontend Developer', 'Data Analyst'].map((role) => (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`flex items-center gap-3 p-4 rounded-lg border text-left cursor-pointer transition-all ${
                          selectedRole === role 
                            ? 'border-[#0066FF] bg-[#0066FF]/5 text-white' 
                            : 'border-[#1F1F1F] bg-[#121212] text-neutral-400 hover:border-[#262626]'
                        }`}
                      >
                        <Briefcase className={`h-5 w-5 ${selectedRole === role ? 'text-[#0066FF]' : 'text-neutral-500'}`} />
                        <span className="text-sm font-medium">{role}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Interview Difficulty Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['easy', 'medium', 'hard'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`py-2 px-3 rounded-md border text-center text-xs font-semibold capitalize cursor-pointer transition-all ${
                          difficulty === level 
                            ? 'border-[#0066FF] bg-[#0066FF]/5 text-white' 
                            : 'border-[#1F1F1F] bg-[#121212] text-neutral-400 hover:border-[#262626]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setCurrentStep('resume')}
                    className="flex items-center gap-2 py-2 px-5 bg-[#0066FF] hover:bg-[#0052CC] text-white text-sm font-medium rounded-md cursor-pointer transition-colors"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: RESUME UPLOAD */}
          {currentStep === 'resume' && (
            <motion.div 
              key="resume"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl space-y-8"
            >
              <div className="space-y-2 text-center md:text-left">
                <span className="text-xs font-semibold text-[#0066FF] uppercase tracking-wider">Step 2 of 3</span>
                <h1 className="text-3xl font-bold tracking-tight text-white">Upload your resume</h1>
                <p className="text-neutral-400 text-sm">We parse your profile, skills, and projects to align interviewer topics.</p>
              </div>

              <div className="space-y-6">
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-4 cursor-pointer transition-all ${
                    isDragging ? 'border-[#0066FF] bg-[#0066FF]/5' : 
                    (resumeFile ? 'border-emerald-500 bg-emerald-500/5' : 'border-[#262626] bg-[#121212] hover:border-[#404040]')
                  }`}
                  onClick={() => document.getElementById('resume-file-input')?.click()}
                >
                  <input
                    type="file"
                    id="resume-file-input"
                    className="hidden"
                    accept="application/pdf"
                    onChange={handleFileSelect}
                  />
                  {resumeFile ? (
                    <>
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{resumeFile.name}</p>
                        <p className="text-xs text-neutral-500">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB • PDF Document</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                        <Upload className="h-6 w-6 text-neutral-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Drag & drop your resume PDF here</p>
                        <p className="text-xs text-neutral-500">or click to browse from system files</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => setCurrentStep('role')}
                    className="flex items-center gap-2 py-2 px-4 bg-[#121212] border border-[#1F1F1F] hover:bg-[#1C1C1E] text-neutral-400 hover:text-white text-sm font-medium rounded-md cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep('github')}
                    disabled={!resumeFile}
                    className="flex items-center gap-2 py-2 px-5 bg-[#0066FF] hover:bg-[#0052CC] disabled:bg-[#0066FF]/50 text-white text-sm font-medium rounded-md cursor-pointer transition-colors"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: GITHUB SYNC */}
          {currentStep === 'github' && (
            <motion.div 
              key="github"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl space-y-8"
            >
              <div className="space-y-2 text-center md:text-left">
                <span className="text-xs font-semibold text-[#0066FF] uppercase tracking-wider">Step 3 of 3</span>
                <h1 className="text-3xl font-bold tracking-tight text-white">Connect code repositories</h1>
                <p className="text-neutral-400 text-sm">Select 1-3 repositories you built. The AI will inspect your code patterns and architecture to plan reviews.</p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
                    </svg>

                    <input
                      type="text"
                      placeholder="Enter GitHub username"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#121212] border border-[#262626] rounded-md text-sm text-white focus:outline-none focus:border-[#0066FF]"
                    />
                  </div>
                  <button
                    onClick={fetchGitHubRepos}
                    disabled={searchingRepos || !githubUsername.trim()}
                    className="flex items-center gap-1.5 px-4 bg-[#1C1C1E] border border-[#262626] hover:bg-[#262626] text-white text-sm font-medium rounded-md cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {searchingRepos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </button>
                </div>

                {repoSearchError && (
                  <p className="text-xs text-red-500">{repoSearchError}</p>
                )}

                {repos.length > 0 && (
                  <div className="border border-[#1F1F1F] rounded-lg max-h-60 overflow-y-auto divide-y divide-[#1F1F1F]">
                    {repos.map((repo) => {
                      const isSelected = selectedRepos.includes(repo.html_url)
                      return (
                        <div 
                          key={repo.id}
                          onClick={() => toggleRepoSelection(repo.html_url)}
                          className="flex items-center justify-between p-3 hover:bg-[#121212] cursor-pointer transition-colors"
                        >
                          <div className="space-y-0.5 pr-4">
                            <p className="text-sm font-semibold text-white">{repo.name}</p>
                            {repo.description && (
                              <p className="text-xs text-neutral-400 line-clamp-1">{repo.description}</p>
                            )}
                            {repo.language && (
                              <span className="inline-block text-[10px] text-neutral-500 border border-[#262626] px-1.5 py-0.5 rounded bg-[#0A0A0A]">
                                {repo.language}
                              </span>
                            )}
                          </div>
                          <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected ? 'border-[#0066FF] bg-[#0066FF] text-white' : 'border-[#262626]'
                          }`}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => setCurrentStep('resume')}
                    className="flex items-center gap-2 py-2 px-4 bg-[#121212] border border-[#1F1F1F] hover:bg-[#1C1C1E] text-neutral-400 hover:text-white text-sm font-medium rounded-md cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    onClick={handleCompleteOnboarding}
                    className="flex items-center gap-2 py-2 px-5 bg-[#0066FF] hover:bg-[#0052CC] text-white text-sm font-medium rounded-md cursor-pointer transition-colors"
                  >
                    Complete Sync
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: PROCESSING STATUS */}
          {currentStep === 'processing' && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center space-y-6 max-w-md"
            >
              <Loader2 className="h-10 w-10 animate-spin text-[#0066FF]" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">Synthesizing Profile Context</h2>
                <p className="text-sm text-neutral-400">{statusMessage}</p>
              </div>
              <div className="w-full bg-[#121212] h-1 rounded-full overflow-hidden">
                <div className="bg-[#0066FF] h-full animate-pulse w-3/4 rounded-full"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
