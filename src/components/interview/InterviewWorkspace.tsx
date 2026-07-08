'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
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
  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConcluding, setIsConcluding] = useState(false)
  const [hintText, setHintText] = useState<string | null>(null)
  const [loadingHint, setLoadingHint] = useState(false)

  // Build a multi-language template map — db templates take priority, client fallbacks always available
  const defaultTemplates = useMemo(() => {
    const db = interview.agenda?.[0]?.templates || {}
    const interviewType = interview.type || ''

    const isLRU = interviewType.includes('CS Fundamentals') || interviewType.includes('System Design')
    const isPR  = interviewType.includes('PR Critique')

    const fallback = isLRU ? {
      javascript: `// CS Fundamentals: Design an LRU Cache with O(1) reads/writes\nclass LRUCache {\n    constructor(capacity) {\n        this.capacity = capacity;\n        this.cache = new Map();\n    }\n    get(key) { return -1; }\n    put(key, value) {}\n}`,
      typescript: `// CS Fundamentals: LRU Cache\nclass LRUCache {\n    private capacity: number;\n    private cache = new Map<number,number>();\n    constructor(capacity: number) { this.capacity = capacity; }\n    get(key: number): number { return -1; }\n    put(key: number, value: number): void {}\n}`,
      python: `# CS Fundamentals: LRU Cache\nclass LRUCache:\n    def __init__(self, capacity: int):\n        self.capacity = capacity\n        self.cache = {}\n    def get(self, key: int) -> int:\n        return -1\n    def put(self, key: int, value: int) -> None:\n        pass`,
      cpp: `#include <unordered_map>\n#include <list>\nusing namespace std;\n\nclass LRUCache {\nprivate:\n    int capacity;\n    list<pair<int,int>> lru;\n    unordered_map<int, list<pair<int,int>>::iterator> cache;\npublic:\n    LRUCache(int cap) : capacity(cap) {}\n    int get(int key) { return -1; }\n    void put(int key, int value) {}\n};`,
      java: `import java.util.*;\n\nclass LRUCache {\n    private int capacity;\n    private LinkedHashMap<Integer,Integer> cache;\n    public LRUCache(int capacity) {\n        this.capacity = capacity;\n        this.cache = new LinkedHashMap<>(16, 0.75f, true);\n    }\n    public int get(int key) { return -1; }\n    public void put(int key, int value) {}\n}`,
      go: `package main\n\ntype LRUCache struct {\n    capacity int\n}\nfunc Constructor(capacity int) LRUCache { return LRUCache{capacity} }\nfunc (c *LRUCache) Get(key int) int { return -1 }\nfunc (c *LRUCache) Put(key int, value int) {}`,
      sql: `-- LRU-style eviction query\nSELECT key, value FROM cache ORDER BY last_accessed ASC LIMIT 1;`
    } : isPR ? {
      javascript: `// PR Critique: Find the concurrency race condition\nconst sessions = {};\nasync function handleAccess(userId, token) {\n    if (sessions[userId]) {\n        await new Promise(r => setTimeout(r, 100));\n        delete sessions[userId];\n    }\n    sessions[userId] = { token, since: Date.now() };\n    return sessions[userId];\n}`,
      typescript: `const sessions: Record<string, {token:string;since:number}> = {};\nasync function handleAccess(userId: string, token: string) {\n    if (sessions[userId]) {\n        await new Promise(r => setTimeout(r, 100));\n        delete sessions[userId];\n    }\n    sessions[userId] = { token, since: Date.now() };\n    return sessions[userId];\n}`,
      python: `import asyncio, time\nsessions = {}\nasync def handle_access(user_id, token):\n    if user_id in sessions:\n        await asyncio.sleep(0.1)\n        del sessions[user_id]\n    sessions[user_id] = {'token': token, 'since': time.time()}\n    return sessions[user_id]`,
      cpp: `#include <unordered_map>\n#include <string>\n#include <chrono>\n#include <thread>\nusing namespace std;\n\nunordered_map<string,string> sessions;\nvoid handle_access(string userId, string token) {\n    if (sessions.count(userId)) {\n        this_thread::sleep_for(chrono::milliseconds(100));\n        sessions.erase(userId);\n    }\n    sessions[userId] = token;\n}`,
      java: `import java.util.concurrent.ConcurrentHashMap;\n\npublic class SessionManager {\n    private static ConcurrentHashMap<String,String> sessions = new ConcurrentHashMap<>();\n    public static String handleAccess(String userId, String token) throws InterruptedException {\n        if (sessions.containsKey(userId)) {\n            Thread.sleep(100);\n            sessions.remove(userId);\n        }\n        sessions.put(userId, token);\n        return sessions.get(userId);\n    }\n}`,
      go: `package main\nimport \"time\"\nvar sessions = make(map[string]string)\nfunc HandleAccess(userId, token string) {\n    time.Sleep(100 * time.Millisecond)\n    sessions[userId] = token\n}`,
      sql: `SELECT * FROM user_sessions WHERE user_id = 1 FOR UPDATE;`
    } : {
      javascript: `// DSA Sandbox\nfunction solve(arr) {\n    // TODO: implement your solution\n    return [];\n}`,
      typescript: `function solve(arr: number[]): number[] {\n    // TODO: implement your solution\n    return [];\n}`,
      python: `# DSA Sandbox\ndef solve(arr: list[int]) -> list[int]:\n    # TODO: implement your solution\n    return []`,
      cpp: `#include <vector>\nusing namespace std;\n\nvector<int> solve(vector<int>& arr) {\n    // TODO: implement your solution\n    return {};\n}`,
      java: `import java.util.*;\n\npublic class Solution {\n    public List<Integer> solve(int[] arr) {\n        // TODO: implement your solution\n        return new ArrayList<>();\n    }\n}`,
      go: `package main\n\nfunc solve(arr []int) []int {\n    // TODO: implement your solution\n    return []int{}\n}`,
      sql: `-- Write your SQL query here\nSELECT * FROM table_name WHERE condition;`
    }

    // DB templates override client fallbacks where available
    return { ...fallback, ...db }
  }, [interview])

  const handleLanguageChange = (newLang: string) => {
    setEditorLanguage(newLang)
    const template = defaultTemplates[newLang as keyof typeof defaultTemplates]
    if (template) {
      // Only ask confirmation if user has written custom code
      if (!isDirty) {
        setCodeContent(template)
      } else {
        const confirmed = window.confirm(`Switch to ${newLang === 'cpp' ? 'C++' : newLang}? Your current code will be replaced with the starter template.`)
        if (confirmed) {
          setCodeContent(template)
          setIsDirty(false)
        }
      }
    }
  }


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
      // New interviewer question has fully arrived — clear any stale clue
      setHintText(null)
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
          chatHistory: messages.slice(-8), // always send latest messages for freshest context
          codeState: codeContent,
          interviewContext: {
            title: interview.title,
            type: interview.type,
            role: interview.role,
            difficulty: interview.difficulty,
            agenda: interview.agenda,
            currentLanguage: editorLanguage,
          }
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
              onChange={(e) => handleLanguageChange(e.target.value)}
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
              onChange={(value) => {
                setCodeContent(value || '')
                setIsDirty(true)
              }}

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
