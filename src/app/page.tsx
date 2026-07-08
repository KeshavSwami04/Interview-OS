import Link from "next/link";
import { ArrowRight, Terminal, Cpu, Target, Award } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-white">
      {/* Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-[#121212]">
        <div className="flex items-center gap-2">
            <svg className="h-7 w-7" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="7" fill="#111111"/>
              <path d="M7 11L13 16L7 21" stroke="url(#lg1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="16" y="19.5" width="9" height="2.5" rx="1.25" fill="url(#lg2)"/>
              <defs>
                <linearGradient id="lg1" x1="7" y1="11" x2="13" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#0066FF"/><stop offset="1" stopColor="#00DDFF"/></linearGradient>
                <linearGradient id="lg2" x1="16" y1="20" x2="25" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#0066FF"/><stop offset="1" stopColor="#00DDFF"/></linearGradient>
              </defs>
            </svg>


          <span className="font-semibold tracking-tight text-white text-lg">Interview OS</span>
        </div>
        <Link 
          href="/login" 
          className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
        >
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto py-16 md:py-24 space-y-10">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#1F1F1F] text-neutral-400 border border-[#262626]">
            <Cpu className="h-3.5 w-3.5 text-[#0066FF]" />
            AI Technical Mock Platform
          </span>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            The mock interviewer <br />
            that actually knows <span className="text-[#0066FF]">your work</span>.
          </h1>
          
          <p className="max-w-2xl mx-auto text-neutral-400 text-sm md:text-base leading-relaxed pt-2">
            Generic mock questions won't prepare you for FAANG or top-tier tech rounds. We analyze your resume and GitHub repositories to generate highly personalized technical interviews that feel like talking to a real Senior Engineer.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <Link
            href="/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-[#0066FF] hover:bg-[#0052CC] text-white text-sm font-semibold rounded-md cursor-pointer transition-colors"
          >
            Start Your Free Mock
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left w-full">
          <div className="p-6 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-3">
            <div className="h-8 w-8 rounded bg-[#1A1A1A] flex items-center justify-center">
              <Terminal className="h-4 w-4 text-[#0066FF]" />
            </div>
            <h3 className="text-sm font-semibold text-white">Monaco Code Workspace</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Refactor and optimize code inside an integrated Monaco Editor. Spot race conditions, database anomalies, and logical leaks in real time.
            </p>
          </div>

          <div className="p-6 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-3">
            <div className="h-8 w-8 rounded bg-[#1A1A1A] flex items-center justify-center">
              <Cpu className="h-4 w-4 text-[#0066FF]" />
            </div>
            <h3 className="text-sm font-semibold text-white">Adaptive Grill Mode</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              No static scripts. The AI interviewer listens to your responses and asks deep, context-aware follow-ups that challenge your design choices.
            </p>
          </div>

          <div className="p-6 bg-[#121212] border border-[#1F1F1F] rounded-lg space-y-3">
            <div className="h-8 w-8 rounded bg-[#1A1A1A] flex items-center justify-center">
              <Award className="h-4 w-4 text-[#0066FF]" />
            </div>
            <h3 className="text-sm font-semibold text-white">Readiness Roadmaps</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Receive detailed scorecard metrics grading technical depth and communication, paired with a custom roadmap targeting your weaknesses.
            </p>
          </div>
        </div>
      </main>


      {/* Footer */}
      <footer className="py-6 border-t border-[#121212] text-center text-xs text-neutral-600">
        © 2026 Interview OS. Built for software engineers.
      </footer>
    </div>
  );
}

