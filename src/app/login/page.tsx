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
