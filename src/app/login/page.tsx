'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'


// Wrap search params logic in a Suspense component to prevent Next.js build-time errors
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'auth-failed') {
      setErrorMessage('Authentication failed. Please check your credentials or provider settings.')
    }
  }, [searchParams])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)
    setInfoMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setInfoMessage('Verification email sent. Please check your inbox.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An authentication error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: provider === 'github' ? 'read:user repo' : undefined,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to sign in with ${provider}.`)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md p-8 bg-[#121212] border border-[#1F1F1F] rounded-xl shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="text-sm text-neutral-400">
          {isSignUp
            ? 'Sign up to start your technical mock preparation'
            : 'Login to access your readiness dashboard'}
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 text-xs bg-red-950/50 border border-red-900/50 text-red-400 rounded-md">
          {errorMessage}
        </div>
      )}

      {infoMessage && (
        <div className="p-3 text-xs bg-emerald-950/50 border border-emerald-900/50 text-emerald-400 rounded-md">
          {infoMessage}
        </div>
      )}

      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-neutral-400 font-medium">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              required
              className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#262626] rounded-md text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#0066FF] transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-neutral-400 font-medium">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#262626] rounded-md text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#0066FF] transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 bg-[#0066FF] hover:bg-[#0052CC] disabled:bg-[#0066FF]/50 text-white text-sm font-medium rounded-md cursor-pointer transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {isSignUp ? 'Sign Up' : 'Sign In'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="relative flex py-2 items-center justify-center">
        <div className="flex-grow border-t border-[#1F1F1F]"></div>
        <span className="flex-shrink mx-4 text-[10px] text-neutral-500 uppercase tracking-widest">or continue with</span>
        <div className="flex-grow border-t border-[#1F1F1F]"></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleOAuthLogin('github')}
          disabled={loading}
          className="flex items-center justify-center gap-2 py-2 bg-[#1A1A1A] hover:bg-[#262626] border border-[#262626] text-white text-xs font-medium rounded-md cursor-pointer transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
          </svg>
          GitHub
        </button>

        <button
          onClick={() => handleOAuthLogin('google')}
          disabled={loading}
          className="flex items-center justify-center gap-2 py-2 bg-[#1A1A1A] hover:bg-[#262626] border border-[#262626] text-white text-xs font-medium rounded-md cursor-pointer transition-colors"
        >
          {/* Simple custom Google logo SVG */}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.444-2.89-6.444-6.443s2.89-6.443 6.444-6.443c1.558 0 2.977.56 4.086 1.488l3.18-3.18C19.336 2.063 15.98 1 12.24 1 5.48 1 0 6.48 0 13.24s5.48 12.24 12.24 12.24c6.88 0 12.24-5.48 12.24-12.24 0-.756-.08-1.503-.227-2.227l-12.013.072z"/>
          </svg>
          Google
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-xs text-neutral-400 hover:text-white transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
      <Suspense fallback={
        <div className="flex items-center gap-2 text-neutral-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[#0066FF]" />
          Loading authentication workspace...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
