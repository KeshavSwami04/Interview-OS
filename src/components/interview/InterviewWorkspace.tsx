'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Editor from '@monaco-editor/react'
import { motion } from 'framer-motion'
import { 
  Send, 
  Mic, 
  MicOff, 
  Lightbulb, 
  CheckSquare, 
  XSquare, 
  Loader2, 
  ArrowLeft,
  ChevronRight,
  Terminal,
  Code2
} from 'lucide-react'

// TS interface declarations
interface InterviewWorkspaceProps {
  interview: any
  initialMessages: any[]
}

export default function InterviewWorkspace({ interview, initialMessages }: InterviewWorkspaceProps) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<any[]>(initialMessages)
  const [inputText, setInputText] = useState('')
  const [codeContent, setCodeContent] = useState(
    interview.agenda?.[0]?.initialCode || 
    `// Connected repository workspace\n// Choose a language and write your refactoring below\n\nfunction processData(input) {\n    // Spot the architectural or safety flaws here...\n    return input;\n}`
  )
  const [editorLanguage, setEditorLanguage] = useState('javascript')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConcluding, setIsConcluding] = useState(false)
  const [hintText, setHintText] = useState<string | null>(null)
  const [loadingHint, setLoadingHint] = useState(false)

  // Voice Dictation (Client-Side HTML5 SpeechRecognition)
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)

  useEffect(() => {
    // Initialize Web Speech API if supported by browser
    if (typeof window !== 'undefined') {
      const SpeechRecognition = 
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const rec = new SpeechRecognition()
        rec.continuous = true
        rec.interimResults = false
        rec.lang = 'en-US'

        rec.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript
          setInputText(prev => prev + (prev ? ' ' : '') + transcript)
        }

        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }

        rec.onend = () => {
          setIsListening(false)
        }

        setRecognition(rec)
      }
    }
  }, [])

  // Scroll chat feed to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const toggleListening = () => {
    if (!recognition) {
      alert('Voice dictation is not supported in this browser. Please use Chrome/Safari.')
      return
    }

    if (isListening) {
      recognition.stop()
      setIsListening(false)
    } else {
      recognition.start()
      setIsListening(true)
    }
  }

  // Handle message submission
  const handleSubmitMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() && !isSubmitting) return

    setIsSubmitting(true)
    setHintText(null)
    const currentInput = inputText
    setInputText('')

    // 1. Append user message locally
    const userMsg = {
      id: Math.random().toString(),
      sender: 'candidate',
      message_text: currentInput,
      code_submission: codeContent,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMsg])

    try {
      // Stop voice recorder if active
      if (isListening && recognition) {
        recognition.stop()
      }

      // 2. Submit to Edge Streaming chat API
      const response = await fetch(`/api/interviews/${interview.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageText: currentInput,
          code: codeContent,
        }),
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        console.error('API Error Response Payload:', errJson)
        throw new Error(errJson.error || 'Message submission failed')
      }


      // Prepare local state for streaming reply
      const botMsgId = Math.random().toString()
      const botMsg = {
        id: botMsgId,
        sender: 'interviewer',
        message_text: '',
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, botMsg])

      // Stream evaluation text chunks from Edge response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No body stream reader available')

      let accumulatedText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        accumulatedText += chunk
        
        // Update the last bot message chunk-by-chunk
        setMessages(prev => 
          prev.map(m => m.id === botMsgId ? { ...m, message_text: accumulatedText } : m)
        )
      }
    } catch (err) {
      console.error(err)
      alert('Failed to transmit message. Retrying...')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Request AI hint
  const handleRequestHint = async () => {
    setLoadingHint(true)
    setHintText(null)
    try {
      const response = await fetch(`/api/interviews/${interview.id}/hint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatHistory: messages.slice(-4), // send last 4 turns for context
          codeState: codeContent
        })
      })
      if (!response.ok) throw new Error('Failed to load hint')
      const data = await response.json()
      setHintText(data.hint)
    } catch (err) {
      console.error(err)
      setHintText('Keep thinking about safety, boundary checks, and runtime complexity.')
    } finally {
      setLoadingHint(false)
    }
  }

  // End interview and generate report card
  const handleConcludeSession = async () => {
    setIsConcluding(true)

    try {
      const response = await fetch(`/api/interviews/${interview.id}/conclude`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      if (!response.ok) throw new Error('Failed to conclude session')
      router.push(`/interview/${interview.id}/report`)
    } catch (err) {
      console.error(err)
      alert('Failed to evaluate session.')
      setIsConcluding(false)
    }
  }

  return (
    <div className="h-screen w-screen bg-[#0A0A0A] text-white flex flex-col overflow-hidden font-sans select-none">
      {/* Top Workspace Navbar */}
      <header className="h-14 border-b border-[#1F1F1F] bg-[#0E0E0E] flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-1.5 rounded hover:bg-[#1A1A1A] border border-[#1F1F1F] text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div>
            <h1 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#0066FF] animate-pulse"></span>
              {interview.title}
            </h1>
            <p className="text-[10px] text-neutral-400 capitalize">{interview.role} • {interview.difficulty} level</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRequestHint}
            disabled={loadingHint || isSubmitting}
            className="flex items-center gap-1 py-1.5 px-3 rounded-md bg-[#1C1C1E] border border-[#262626] hover:bg-[#262626] text-neutral-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {loadingHint ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5 text-amber-400" />}
            Clue
          </button>
          <button
            onClick={handleConcludeSession}
            disabled={isConcluding}
            className="flex items-center gap-1 py-1.5 px-4 bg-red-950/50 hover:bg-red-900/50 border border-red-900/50 text-red-400 text-xs font-semibold rounded-md cursor-pointer transition-colors"
          >
            {isConcluding ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckSquare className="h-3.5 w-3.5" />}
            Conclude Session
          </button>
        </div>
      </header>

      {/* Main Sandbox Split pane */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Scrollable Interview Chat Console */}
        <div className="w-1/2 flex flex-col border-r border-[#1F1F1F] bg-[#0A0A0A] relative">
          
          {/* Scrollable messages list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, index) => {
              const isInterviewer = msg.sender === 'interviewer'
              return (
                <div 
                  key={msg.id || index}
                  className={`flex ${isInterviewer ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[85%] rounded-lg p-4 font-sans text-xs leading-relaxed ${
                    isInterviewer 
                      ? 'bg-[#121212] border border-[#1F1F1F] text-neutral-200' 
                      : 'bg-[#0066FF]/10 border border-[#0066FF]/20 text-white'
                  }`}>
                    {/* Render message formatting lines securely */}
                    <div className="whitespace-pre-line font-mono text-[11px] leading-relaxed">
                      {msg.message_text || 'Thinking...'}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Hint Overlay Alert */}
          {hintText && (
            <div className="mx-6 mb-2 p-3 bg-amber-950/30 border border-amber-900/50 rounded-md flex items-start gap-2.5">
              <Lightbulb className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-300 leading-relaxed font-mono">{hintText}</p>
            </div>
          )}

          {/* Chat Form prompt container */}
          <form onSubmit={handleSubmitMessage} className="p-4 bg-[#0E0E0E] border-t border-[#1F1F1F] flex items-center gap-3">
            <input
              type="text"
              placeholder={isSubmitting ? 'Transmitting reply...' : 'Type your architectural explanation...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 bg-[#0A0A0A] border border-[#262626] rounded-md text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#0066FF] disabled:opacity-50"
            />


            <button
              type="submit"
              disabled={isSubmitting || !inputText.trim()}
              className="p-2.5 rounded-full bg-[#0066FF] hover:bg-[#0052CC] disabled:bg-[#0066FF]/50 text-white cursor-pointer transition-colors"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>

        {/* Right Side: Monaco Code Editor */}
        <div className="w-1/2 flex flex-col bg-[#0E0E0E]">
          {/* Top Panel editor config tabs */}
          <div className="h-10 border-b border-[#1F1F1F] bg-[#121212] flex items-center justify-between px-4">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-[#0066FF]" />
              Monaco Code Sandbox
            </span>
            <select
              value={editorLanguage}
              onChange={(e) => setEditorLanguage(e.target.value)}
              className="py-1 px-2.5 bg-[#0A0A0A] border border-[#262626] text-white text-[10px] rounded focus:outline-none focus:border-[#0066FF]"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="go">Go</option>
              <option value="sql">SQL</option>
            </select>

          </div>

          {/* Monaco Editor Component instance */}
          <div className="flex-1 relative">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              language={editorLanguage}
              theme="vs-dark"
              value={codeContent}
              onChange={(value) => setCodeContent(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'var(--font-geist-mono), monospace',
                lineHeight: 20,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6
                }
              }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
