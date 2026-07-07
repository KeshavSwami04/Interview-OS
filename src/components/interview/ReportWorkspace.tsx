'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink, 
  Map, 
  FileText,
  ChevronDown,
  ChevronUp,
  Cpu,
  BookOpen,
  Award
} from 'lucide-react'

interface ReportWorkspaceProps {
  interview: any
  messages: any[]
}

export default function ReportWorkspace({ interview, messages }: ReportWorkspaceProps) {
  const router = useRouter()
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null)

  const scorecard = interview.scorecard || {
    overall: 0,
    communication: 0,
    problemSolving: 0,
    technical: 0,
    strengths: [],
    weaknesses: []
  }

  const roadmap = interview.roadmap || []

  const toggleMessageExpansion = (id: string) => {
    setExpandedMessageId(prev => prev === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans selection:bg-[#0066FF] selection:text-white">
      {/* Top Header Navbar */}
      <header className="border-b border-[#1F1F1F] bg-[#0E0E0E] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-1.5 rounded hover:bg-[#1A1A1A] border border-[#1F1F1F] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <div>
              <h1 className="text-xs font-bold text-white tracking-tight">Performance Scorecard</h1>
              <p className="text-[10px] text-neutral-400">Mock Session review for {interview.title}</p>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="py-1.5 px-4 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-md cursor-pointer transition-colors"
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Main Report Body */}
      <main className="flex-grow max-w-5xl mx-auto px-6 py-10 w-full space-y-12">
        
        {/* Core Metric Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#121212] border border-[#1F1F1F] rounded-xl p-8 items-center">
          <div className="flex flex-col items-center justify-center text-center space-y-2 border-b md:border-b-0 md:border-r border-[#1F1F1F] pb-6 md:pb-0">
            <span className="text-[10px] uppercase font-bold text-[#0066FF] tracking-wider">Readiness Quotient</span>
            <div className="relative h-28 w-28 flex items-center justify-center">
              {/* Circular score ring using SVG */}
              <svg className="absolute h-full w-full -rotate-90">
                <circle 
                  cx="56" cy="56" r="48" 
                  stroke="#1F1F1F" strokeWidth="6" fill="transparent"
                />
                <circle 
                  cx="56" cy="56" r="48" 
                  stroke="#0066FF" strokeWidth="6" fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${2 * Math.PI * 48 * (1 - scorecard.overall / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-3xl font-extrabold text-white">{scorecard.overall}%</span>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4 md:pl-6">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              <Award className="h-5 w-5 text-[#0066FF]" />
              Session Assessment
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed font-sans">
              You demonstrate capable domain understanding for a {interview.role} track. 
              Refactoring concurrency parameters and db design normalizations will align you with FAANG-level engineering criteria.
            </p>
            
            {/* Skill sliders */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="space-y-1">
                <span className="text-[9px] text-neutral-500 uppercase font-semibold">Coding</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#1F1F1F] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#0066FF] h-full" style={{ width: `${scorecard.technical || scorecard.overall}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-white">{scorecard.technical || scorecard.overall}%</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-neutral-500 uppercase font-semibold">Logics</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#1F1F1F] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#0066FF] h-full" style={{ width: `${scorecard.problemSolving || scorecard.overall}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-white">{scorecard.problemSolving || scorecard.overall}%</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-neutral-500 uppercase font-semibold">Communication</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#1F1F1F] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#0066FF] h-full" style={{ width: `${scorecard.communication || scorecard.overall}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-white">{scorecard.communication || scorecard.overall}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strengths & Weaknesses Split Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Strengths */}
          <div className="p-6 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-4">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Core Competencies
            </h3>
            <ul className="space-y-3">
              {scorecard.strengths?.map((str: string, index: number) => (
                <li key={index} className="text-xs text-neutral-300 leading-relaxed pl-1.5 border-l-2 border-emerald-500">
                  {str}
                </li>
              ))}
              {(!scorecard.strengths || scorecard.strengths.length === 0) && (
                <li className="text-xs text-neutral-500">No specific strengths recorded. Keep practicing.</li>
              )}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="p-6 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-4">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Identified Skill Gaps
            </h3>
            <ul className="space-y-3">
              {scorecard.weaknesses?.map((weak: string, index: number) => (
                <li key={index} className="text-xs text-neutral-300 leading-relaxed pl-1.5 border-l-2 border-amber-500">
                  {weak}
                </li>
              ))}
              {(!scorecard.weaknesses || scorecard.weaknesses.length === 0) && (
                <li className="text-xs text-neutral-500">No critical code gaps found during mock evaluation.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Personalized Interactive Study Roadmap */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Map className="h-4 w-4 text-[#0066FF]" />
            Your Study Roadmap
          </h3>

          <div className="relative border-l border-[#1F1F1F] ml-4 pl-8 space-y-8">
            {roadmap.map((step: any, idx: number) => (
              <div key={step.id || idx} className="relative">
                {/* Timeline node icon */}
                <div className="absolute -left-[45px] top-1.5 h-8 w-8 rounded-full border border-[#1F1F1F] bg-[#0E0E0E] flex items-center justify-center text-xs font-bold text-neutral-400 shadow-md">
                  {idx + 1}
                </div>
                <div className="p-5 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-2 hover:border-[#262626] transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-xs font-bold text-white">{step.title}</h4>
                    <span className="text-[8px] uppercase tracking-wider font-extrabold bg-[#1A1A1A] border border-[#262626] text-neutral-400 px-2 py-0.5 rounded">
                      {step.topic}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">{step.desc}</p>
                  {step.resource && (
                    <a 
                      href={step.resource} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1 text-[10px] text-[#0066FF] hover:underline pt-2 font-medium"
                    >
                      Study Reference Resource
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chronological Chat Transcript Accordions */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-[#0066FF]" />
            Transcript Analysis Log
          </h3>

          <div className="border border-[#1F1F1F] bg-[#121212] rounded-lg divide-y divide-[#1F1F1F] overflow-hidden">
            {messages.map((msg, index) => {
              const isInterviewer = msg.sender === 'interviewer'
              const isExpanded = expandedMessageId === msg.id

              return (
                <div key={msg.id || index} className="w-full">
                  <button 
                    onClick={() => toggleMessageExpansion(msg.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-[#18181B] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                        isInterviewer 
                          ? 'bg-[#1A1A1A] border border-[#262626] text-neutral-400' 
                          : 'bg-[#0066FF]/10 border border-[#0066FF]/20 text-[#0066FF]'
                      }`}>
                        {msg.sender}
                      </span>
                      <span className="text-[11px] text-neutral-300 font-mono line-clamp-1 truncate max-w-[400px]">
                        {msg.message_text}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-neutral-500" /> : <ChevronDown className="h-4 w-4 text-neutral-500" />}
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-[#0A0A0A] border-t border-[#1F1F1F] space-y-3 font-mono text-[11px] leading-relaxed text-neutral-400">
                      <p className="whitespace-pre-line text-neutral-200">
                        {msg.message_text}
                      </p>
                      {msg.code_submission && (
                        <div className="space-y-1.5 pt-2">
                          <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Code state at this turn:</span>
                          <pre className="p-3 bg-[#121212] border border-[#1F1F1F] rounded text-white overflow-x-auto text-[10px] leading-normal font-mono">
                            {msg.code_submission}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-[#121212] text-center text-xs text-neutral-600">
        © 2026 Interview OS. Built for software engineers.
      </footer>
    </div>
  )
}
