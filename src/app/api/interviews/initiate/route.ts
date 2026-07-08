import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function extractJson(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/)
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim())
      } catch {}
    }
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch {}
    }
  }
  return null
}

function getFallbackTemplates(type: string, repoName: string) {
  if (type === 'Live PR Critique') {
    return {
      javascript: `// Repository: ${repoName}\n// Task: Inspect this async process. It has concurrency safety issues.\n\nconst userSessions = {};\n\nasync function handleUserAccess(userId, sessionToken) {\n    if (userSessions[userId]) {\n        // User already has session. Clean up old connection.\n        await new Promise(r => setTimeout(r, 100));\n        delete userSessions[userId];\n    }\n    userSessions[userId] = {\n        token: sessionToken,\n        activeSince: new Date()\n    };\n    return userSessions[userId];\n}`,
      typescript: `// Repository: ${repoName}\n// Task: Inspect this async process.\n\ninterface Session {\n  token: string;\n  activeSince: Date;\n}\n\nconst userSessions: Record<string, Session> = {};\n\nasync function handleUserAccess(userId: string, sessionToken: string): Promise<Session> {\n    if (userSessions[userId]) {\n        await new Promise(r => setTimeout(r, 100));\n        delete userSessions[userId];\n    }\n    userSessions[userId] = {\n        token: sessionToken,\n        activeSince: new Date()\n    };\n    return userSessions[userId];\n}`,
      python: `# Repository: ${repoName}\nimport asyncio\nimport time\n\nuser_sessions = {}\n\nasync def handle_user_access(user_id: str, session_token: str):\n    if user_id in user_sessions:\n        await asyncio.sleep(0.1)\n        del user_sessions[user_id]\n    user_sessions[user_id] = {\n        "token": session_token,\n        "active_since": time.time()\n    }\n    return user_sessions[user_id]`,
      cpp: `// Repository: ${repoName}\n// Task: Inspect this concurrency race condition\n#include <string>\n#include <unordered_map>\n#include <thread>\n#include <chrono>\n\nstruct Session {\n    std::string token;\n    long long active_since;\n};\n\nstd::unordered_map<std::string, Session> user_sessions;\n\nSession handle_user_access(std::string user_id, std::string session_token) {\n    if (user_sessions.find(user_id) != user_sessions.end()) {\n        std::this_thread::sleep_for(std::chrono::milliseconds(100));\n        user_sessions.erase(user_id);\n    }\n    user_sessions[user_id] = {session_token, 1234567890LL};\n    return user_sessions[user_id];\n}`,
      java: `// Repository: ${repoName}\nimport java.util.concurrent.ConcurrentHashMap;\n\npublic class SessionManager {\n    public static class Session {\n        public String token;\n        public long activeSince;\n        public Session(String token, long activeSince) {\n            this.token = token;\n            this.activeSince = activeSince;\n        }\n    }\n    \n    private static ConcurrentHashMap<String, Session> userSessions = new ConcurrentHashMap<>();\n    \n    public static Session handleUserAccess(String userId, String sessionToken) throws InterruptedException {\n        if (userSessions.containsKey(userId)) {\n            Thread.sleep(100);\n            userSessions.remove(userId);\n        }\n        Session session = new Session(sessionToken, System.currentTimeMillis());\n        userSessions.put(userId, session);\n        return session;\n    }\n}`,
      go: `// Go concurrency race condition fallback\npackage main\nimport \"time\"\nvar userSessions = make(map[string]string)\nfunc HandleUserAccess(userId string, token string) {\n\t// Simulating concurrency safety audit\n\ttime.Sleep(100 * time.Millisecond)\n\tuserSessions[userId] = token\n}`,
      sql: `-- SQL concurrency simulation fallback\nSELECT * FROM user_sessions WHERE user_id = 1 FOR UPDATE;`
    }
  }

  if (type === 'CS Fundamentals & System Design') {
    return {
      javascript: `// CS Fundamentals: Design a thread-safe, LRU Cache with O(1) reads/writes\n// Task: Implement the get and put methods, maintaining capacity constraints.\n\nclass LRUCache {\n    constructor(capacity) {\n        this.capacity = capacity;\n        this.cache = new Map();\n    }\n\n    get(key) {\n        // TODO: Return value if exists, else -1, and update access order\n        return -1;\n    }\n\n    put(key, value) {\n        // TODO: Insert/Update key-value pair and evict least recently used if over capacity\n    }\n}`,
      typescript: `// CS Fundamentals: Design a thread-safe, LRU Cache\nclass LRUCache {\n    private capacity: number;\n    private cache: Map<number, number>;\n\n    constructor(capacity: number) {\n        this.capacity = capacity;\n        this.cache = new Map();\n    }\n\n    get(key: number): number {\n        return -1;\n    }\n\n    put(key: number, value: number): void {\n    }\n}`,
      python: `# CS Fundamentals: Design an LRU Cache\nclass LRUCache:\n    def __init__(self, capacity: int):\n        self.capacity = capacity\n        self.cache = {}\n\n    def get(self, key: int) -> int:\n        return -1\n\n    def put(self, key: int, value: int) -> None:\n        pass`,
      cpp: `#include <unordered_map>\n#include <list>\n\nclass LRUCache {\nprivate:\n    int capacity;\npublic:\n    LRUCache(int capacity) {\n        this.capacity = capacity;\n    }\n    \n    int get(int key) {\n        return -1;\n    }\n    \n    void put(int key, int value) {\n        \n    }\n};`,
      java: `import java.util.HashMap;\n\npublic class LRUCache {\n    private int capacity;\n    public LRUCache(int capacity) {\n        this.capacity = capacity;\n    }\n    \n    public int get(int key) {\n        return -1;\n    }\n    \n    public void put(int key, int value) {\n    }\n}`,
      go: `package main\n\ntype LRUCache struct {\n    capacity int\n}\n\nfunc Constructor(capacity int) LRUCache {\n    return LRUCache{capacity: capacity}\n}\n\nfunc (this *LRUCache) Get(key int) int {\n    return -1\n}\n\nfunc (this *LRUCache) Put(key int, value int)  {\n}`,
      sql: `-- SQL Cache metrics simulation\nSELECT key, value FROM lru_cache ORDER BY last_accessed LIMIT 1;`
    }
  }

  if (type === 'Behavioral & HR Round') {
    return {
      javascript: `// HR Interview Notes\n// Use this space to note down details of your STAR stories or talking points...`,
      typescript: `// HR Interview Notes\n// Use this space to note down details of your STAR stories...`,
      python: `# HR Interview Notes\n# Use this space to note down details of your STAR stories...`,
      cpp: `// HR Interview Notes\n// Use this space to note down details of your STAR stories...`,
      java: `// HR Interview Notes\n// Use this space to note down details of your STAR stories...`,
      go: `// HR Interview Notes\n// Use this space to note down details of your STAR stories...`,
      sql: `-- HR Interview Notes\n-- Use this space to note down details of your STAR stories...`
    }
  }

  // DSA Mock fallback
  return {
    javascript: `// Workspace\n\nfunction findDuplicateNumbers(arr) {\n    // Implement an O(N) runtime and O(1) auxiliary space duplicate finder\n    return [];\n}`,
    typescript: `// Workspace\n\nfunction findDuplicateNumbers(arr: number[]): number[] {\n    return [];\n}`,
    python: `# Workspace\n\ndef findDuplicateNumbers(arr: list[int]) -> list[int]:\n    return []`,
    cpp: `#include <vector>\n\nstd::vector<int> findDuplicateNumbers(std::vector<int>& arr) {\n    return {};\n}`,
    java: `import java.util.List;\nimport java.util.ArrayList;\n\npublic class Solution {\n    public List<Integer> findDuplicateNumbers(int[] arr) {\n        return new ArrayList<>();\n    }\n}`,
    go: `package main\n\nfunc findDuplicateNumbers(arr []int) []int {\n    return []int{}\n}`,
    sql: `-- SQL duplicate check\nSELECT num, COUNT(*) FROM numbers GROUP BY num HAVING COUNT(*) > 1;`
  }
}


export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role, difficulty, type, repoUrl } = await request.json()

    // Fetch profile data to customize the prompts
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // 2. Setup standard interview agendas (milestones) based on track types

    let agenda = []
    let initialQuestion = ''

    // 1. Set static fallback templates (used if API key is not configured)
    if (type === 'Live PR Critique') {
      const repoName = repoUrl ? repoUrl.split('/').pop() : 'project-repo'
      const fallbackTemplates = getFallbackTemplates(type, repoName)
      agenda = [
        {
          stage: 1,
          topic: 'Bug Critique & Refactoring',
          coreIntent: 'Evaluate safety flaws and code cleanliness',
          initialCode: fallbackTemplates.javascript,
          templates: fallbackTemplates
        }
      ]
      initialQuestion = `Hi, I'm Aditya Kumar, Senior Engineer at Atlassian. Good to meet you. We have about 45 minutes today.

I've pulled a snippet from your repository "${repoName}" — it's a session management module that handles concurrent user access. Take 60 seconds to read through the code on the right.

I want you to walk me through what this function does, and then tell me: if two simultaneous requests arrive for the same userId at the exact same millisecond, what happens? Think aloud — I want to hear your reasoning before you start any refactoring.`
    } else if (type === 'CS Fundamentals & System Design') {
      const fallbackTemplates = getFallbackTemplates(type, '')
      agenda = [
        {
          stage: 1,
          topic: 'Low-Level Class Design (OOP) & System API',
          coreIntent: 'Verify OOP principles, encapsulation, and caching design pattern',
          initialCode: fallbackTemplates.javascript,
          templates: fallbackTemplates
        }
      ]
      initialQuestion = `Hi, I'm Vikram Patel, SDE-3 at Microsoft. Thanks for joining — we have roughly 45 minutes.

We're going to work through a design problem today. Take a look at the skeleton on the right. I want to design a data structure that supports two operations — get(key) and put(key, value) — both in O(1) time, with a fixed capacity that evicts the least recently used entry when full.

Before you touch any code: walk me through your high-level approach. Which data structures are you thinking about, and why? I want your reasoning first.`
    } else if (type === 'Behavioral & HR Round') {
      const fallbackTemplates = getFallbackTemplates(type, '')
      agenda = [
        {
          stage: 1,
          topic: 'STAR Storytelling Intro',
          coreIntent: 'Evaluate presentation and initial experience outline',
          initialCode: '// HR Interview Notes\n// Use this space to note down details of your STAR stories...',
          templates: fallbackTemplates
        }
      ]
      initialQuestion = `Hi, I'm Sneha Reddy, Talent Partner at Google. Good to meet you. We have about 45 minutes today for this behavioral round.

I want to evaluate your communication, teamwork style, and leadership approach. Let's start with a general introduction: walk me through your background, and tell me about a time you faced a major technical bottleneck or tight deadline in a previous project. What was the situation, and what did you do?`
    } else {
      const fallbackTemplates = getFallbackTemplates(type, '')
      // General DSA Mock / Resume Mock fallback
      agenda = [
        {
          stage: 1,
          topic: 'General Algorithmic Logic',
          coreIntent: 'Verify clean loops and complexity bounds',
          initialCode: fallbackTemplates.javascript,
          templates: fallbackTemplates
        }
      ]
      initialQuestion = `Hi, I'm Ankit Verma, SDE-2 at Amazon. Good to have you here — we've got about 45 minutes, so let's get into it.

I have a problem for you. Look at the function stub on the right. Given an array of integers where every element appears twice except for one, you need to find that single non-duplicate element. Your solution needs to run in O(N) time.

Take your time, read the problem. Tell me: what's your initial instinct for how to approach this? Don't jump to code yet — I want to hear your thought process first.`
    }


    // 2. Invoke Unified AI Question Generator (if API Key is configured)
    const apiKey = process.env.OPENROUTER_API_KEY
    if (apiKey && !apiKey.includes('sk-or-v1-...')) {
      try {
        const skillsList = profile?.profile_summary?.skills || []
        const summaryText = profile?.profile_summary?.summary || ''
        const reposList = profile?.github_summary?.selectedRepos || []

        const generatorPrompt = (() => {

          // Behavioral & HR Round
          if (type === 'Behavioral & HR Round') {
            return `You are a senior Talent Partner or HR Director conducting a Googleyness/Behavioral/HR mock interview.

Candidate Profile:
- Target Role: ${role}
- Difficulty: ${difficulty}
- Resume Skills: ${JSON.stringify(skillsList)}
- Profile Summary: ${summaryText}

Your task: Generate a high-end behavioral & HR interview session plan using the STAR framework.

Session structure (5-stage progression — one stage per round of questions):
Stage 1: Intro & STAR framework opening — candidate introduces themselves and talks about a time they had to work under a tight deadline or handle a conflict.
Stage 2: Overcoming conflicts — handling disagreements with teammates, tech leads, or product managers.
Stage 3: Ambiguity & change — how they handle changing specs, undefined requirements, or shifting project scope.
Stage 4: Leadership & ownership — demonstrating extreme ownership, mentoring others, or taking initiative beyond their role.
Stage 5: Vision & values — realistic questions about salary expectations, career trajectory, alignment with company culture.

The "initialQuestion" must introduce a named recruiter (e.g. "Sneha Reddy, Talent Partner at Google") and set the 45-minute context. Then ask the candidate to introduce themselves and share their first STAR story (specifically a time they faced a major project bottleneck). It must feel like the opening of a real HR/Leadership bar-raiser round.

The "templates" object should contain a simple notepad/scratch template since HR rounds are conversational:
"// HR Interview Notes\n// Use this space to note down details of your STAR stories or talking points"

Return ONLY a raw JSON object:
{
  "title": "Behavioral & HR Round",
  "initialQuestion": "Immersive HR interview opener (2-3 paragraphs)",
  "templates": {
    "javascript": "// HR Interview Notes\\n// Note your STAR stories here",
    "typescript": "// HR Interview Notes\\n// Note your STAR stories here",
    "python": "# HR Interview Notes\\n# Note your STAR stories here",
    "cpp": "// HR Interview Notes",
    "java": "// HR Interview Notes",
    "go": "// HR Interview Notes",
    "sql": "-- HR Interview Notes"
  },
  "agenda": [
    { "stage": 1, "topic": "STAR Framework Intro", "coreIntent": "Evaluate communication and initial STAR storytelling quality" },
    { "stage": 2, "topic": "Conflict Resolution", "coreIntent": "Evaluate empathy, teamwork, and professionalism under friction" },
    { "stage": 3, "topic": "Ambiguity & Adaptability", "coreIntent": "Evaluate flexibility and logical reasoning under shifting scopes" },
    { "stage": 4, "topic": "Ownership & Initiative", "coreIntent": "Evaluate leadership and extreme ownership principles" },
    { "stage": 5, "topic": "Vision & Compensation", "coreIntent": "Evaluate long-term alignment, career vision, and realistic negotiation" }
  ]
}`
          }

          // Resume Grill — driven entirely by the candidate's actual resume content
          if (type === 'Resume Grill') {
            return `You are a senior Engineering Manager conducting a Resume & Projects deep-dive interview.

Candidate Profile:
- Target Role: ${role}
- Difficulty: ${difficulty}
- Resume Skills: ${JSON.stringify(skillsList)}
- Profile Summary: ${summaryText}
- GitHub Projects: ${JSON.stringify(reposList.map((r: any) => ({ name: r.name, summary: r.analyzedSummary })))}

Your task: Generate a resume grill session plan rooted in their ACTUAL projects and skills listed above.

Session structure (5-stage progression — one stage per round of questions):
Stage 1: Opening — candidate introduces themselves and walks through their most significant project.
Stage 2: Technical deep-dive — drill into architecture decisions, tech stack choices, and trade-offs in their top project.
Stage 3: Challenges & failures — what went wrong, how did they debug it, what would they change.
Stage 4: Scale & production — how would the system handle 10x load? What monitoring, alerting, or deployment pipeline did they set up?
Stage 5: Behavioral close — ownership, impact, and why they made specific decisions.

The "initialQuestion" must introduce a named interviewer (e.g. "Anjali Bose, Engineering Manager at Amazon") and set the 45-minute context. Then ask the candidate to walk through their most impactful project from their resume. It must feel like the opening of a real HR+Technical round.

The "templates" object should contain a simple notepad/scratch template since Resume Grill is conversational, not code-focused. Something like: "// Interview Notes\n// Use this space to sketch architectures, write pseudo-code, or note your talking points"

Return ONLY a raw JSON object:
{
  "title": "Short descriptive name",
  "initialQuestion": "Immersive interview opener (2-3 paragraphs)",
  "templates": {
    "javascript": "// Interview Notes\\n// Sketch your architecture or talking points here",
    "typescript": "// Interview Notes\\n// Sketch your architecture or talking points here",
    "python": "# Interview Notes\\n# Sketch your architecture or talking points here",
    "cpp": "// Interview Notes",
    "java": "// Interview Notes",
    "go": "// Interview Notes",
    "sql": "-- Interview Notes"
  },
  "agenda": [
    { "stage": 1, "topic": "Project Walkthrough", "coreIntent": "Evaluate communication and ownership of past work" },
    { "stage": 2, "topic": "Technical Deep-Dive", "coreIntent": "Evaluate architecture decisions and tech stack reasoning" },
    { "stage": 3, "topic": "Challenges & Debugging", "coreIntent": "Evaluate problem solving and learning from failure" },
    { "stage": 4, "topic": "Scale & Production", "coreIntent": "Evaluate systems thinking and production awareness" },
    { "stage": 5, "topic": "Behavioral Close", "coreIntent": "Evaluate ownership, impact, and decision rationale" }
  ]
}`
          }

          // Live PR Critique — must use actual GitHub repo context
          if (type === 'Live PR Critique') {
            const repoForPR = reposList.find((r: any) => r.url === repoUrl) || reposList[0]
            const repoName = repoForPR?.name || (repoUrl ? repoUrl.split('/').pop() : 'project-repo')
            const repoSummary = repoForPR?.analyzedSummary || 'A software project repository'
            
            // Pick default language based on target role
            const primaryLang = role.toLowerCase().includes('analyst') ? 'sql' :
                                role.toLowerCase().includes('frontend') ? 'typescript' :
                                skillsList.includes('TypeScript') ? 'typescript' :
                                skillsList.includes('Python') ? 'python' :
                                skillsList.includes('Java') ? 'java' :
                                skillsList.includes('C++') ? 'cpp' : 'javascript'

            // Customize PR flaw guidelines based on target role
            const roleFlawGuideline = (() => {
              if (role.toLowerCase().includes('analyst')) {
                return `Create a SQL query or Python data pipeline script containing an analytical flaw. Specifically:
                - SQL: generate a query with a missing JOIN condition causing a Cartesian product, incorrect GROUP BY aggregation, or unindexed slow subquery.
                - Python: generate a Pandas snippet with a memory-heavy loop instead of vectorized operations, or an index alignment bug during data merges.`
              }
              if (role.toLowerCase().includes('frontend')) {
                return `Create a React component or hooks script containing front-end specific flaws. Specifically:
                - React stale closures in useEffect/callbacks, infinite re-render loops due to unmemoized reference dependency in dependencies array, or memory leaks from missing cleanup inside a subscription callback.`
              }
              return `Create a code snippet containing backend or generic systems flaws. Specifically:
              - A race condition or thread-safety bug in async code, SQL injection / input sanitization gap, memory leak in a loop, or incorrect database transaction isolation usage.`
            })()

            return `You are a senior engineer running a Live Code Review session on a candidate's actual GitHub repository.

Repository being reviewed: "${repoName}"
Repository context: ${repoSummary}
Candidate's target role: ${role}
Candidate's primary language stack: ${JSON.stringify(skillsList)}
Primary language for this review: ${primaryLang}
Interview Difficulty: ${difficulty}

Your task: Generate a realistic PR review session. The code snippet you create MUST:
1. Be plausibly from the "${repoName}" codebase (match the project type/domain based on the repo name and summary)
2. Contain a REAL, specific flaw customized for their target role:
   ${roleFlawGuideline}
3. Be written in ${primaryLang} (or its equivalent)
4. Be 20-40 lines long — realistic PR diff size
5. Have 3 stages: Flaw Identification → Refactoring → Prevention (how to avoid this class of bug in future PRs)

The "initialQuestion" must: introduce a named engineer reviewer at a relevant company, mention 45 minutes, show the code in context ("I've pulled this from your ${repoName} repo — it's the auth middleware / API handler / data layer"), and ask the candidate to read it and describe what they see before diagnosing.

Return ONLY a raw JSON object:
{
  "title": "Short descriptive name",
  "initialQuestion": "Immersive code review opener",
  "templates": {
    "javascript": "actual flawed JS code matching the repo domain",
    "typescript": "same flaw in TypeScript",
    "python": "same flaw in Python",
    "cpp": "same flaw in C++ if applicable",
    "java": "same flaw in Java if applicable",
    "go": "same flaw in Go if applicable",
    "sql": "SQL equivalent if applicable else empty"
  },
  "agenda": [
    { "stage": 1, "topic": "Flaw Identification", "coreIntent": "Identify the bug class and how it manifests" },
    { "stage": 2, "topic": "Refactoring", "coreIntent": "Fix the issue with correct, production-safe code" },
    { "stage": 3, "topic": "Prevention", "coreIntent": "Explain how to prevent this class of bug in future PRs" }
  ]
}`
          }

          // DSA Sandbox — 3 distinct problems across 3 stages, increasing difficulty
          if (type === 'DSA Sandbox') {
            const roleDsaGuidelines = (() => {
              if (role.toLowerCase().includes('analyst')) {
                return `The candidate is preparing for a Data Analyst role.
                Instead of advanced algorithms, focus entirely on data querying, structures, and aggregations.
                - Stage 1: Write SQL query with JOINs, aggregates, and CASE WHEN logic (e.g. active users count).
                - Stage 2: Write Python Pandas script to filter, deduplicate, or group data.
                - Stage 3: Write SQL query utilizing Window Functions (e.g. ROW_NUMBER, RANK, moving averages).
                Difficulty level is scaled: easy (simple aggregates/filters), medium (joins, windows, subqueries), hard (complex query optimizations, CTEs).`
              }
              const difficultyProblems: Record<string, string> = {
                easy: 'Stage 1: an array/string manipulation problem (e.g. two-sum, valid parentheses). Stage 2: a linked list or stack/queue problem. Stage 3: a binary search variant.',
                medium: 'Stage 1: a sliding window or two-pointer problem. Stage 2: a binary tree traversal or BFS/DFS problem. Stage 3: a dynamic programming problem (1D DP like climbing stairs or house robber).',
                hard: 'Stage 1: a graph problem (shortest path or cycle detection). Stage 2: an interval scheduling or merge problem. Stage 3: a 2D dynamic programming problem (edit distance, coin change 2, LCS).'
              }
              return difficultyProblems[difficulty] || difficultyProblems.medium
            })()

            return `You are an engineer running a Coding Round with 3 back-to-back programming problems.

Candidate Profile:
- Target Role: ${role}, Difficulty: ${difficulty}
- Primary Language: ${role.toLowerCase().includes('analyst') ? 'SQL' : skillsList.includes('C++') ? 'C++' : skillsList.includes('Java') ? 'Java' : skillsList.includes('Python') ? 'Python' : 'JavaScript'}
- Skills: ${JSON.stringify(skillsList)}

Session Structure (3 separate coding problems):
${roleDsaGuidelines}

Rules:
1. Generate 3 DISTINCT, NAMED coding problems appropriate for a ${role} role.
2. Each problem is a separate agenda stage — do NOT reuse the same problem.
3. The code skeleton for stage 1 goes in "templates" — stages 2 and 3 skeletons go in agenda[1].templates and agenda[2].templates respectively.
4. For SDE/Frontend/Backend, templates should be provided in JavaScript, TypeScript, Python, C++, Java, and Go. For Data Analyst, templates should contain SQL scripts or Python Pandas code stubs.
5. IMPORTANT: Do NOT place code comments inside or before closing parentheses/brackets/semicolons on the same line. Place comments at end of line only.

The "initialQuestion" must introduce the interviewer and company, mention 3 problems across 45 minutes (~15 min each), and present the FIRST problem naturally as a real interviewer would describe it verbally. Ask for approach first, not code.

Return ONLY a raw JSON object:
{
  "title": "DSA Round — 3 Problems",
  "initialQuestion": "Immersive interview opener presenting problem 1",
  "templates": {
    "javascript": "Problem 1 skeleton in JS",
    "typescript": "Problem 1 skeleton in TS",
    "python": "Problem 1 skeleton in Python",
    "cpp": "Problem 1 skeleton in C++",
    "java": "Problem 1 skeleton in Java",
    "go": "Problem 1 skeleton in Go",
    "sql": "Problem 1 skeleton in SQL"
  },
  "agenda": [
    { "stage": 1, "topic": "Problem 1 name", "coreIntent": "Evaluate approach and correctness", "problemStatement": "Full problem description", "templates": { "javascript": "...", "typescript": "...", "python": "...", "cpp": "...", "java": "...", "go": "...", "sql": "..." } },
    { "stage": 2, "topic": "Problem 2 name", "coreIntent": "Evaluate efficiency and edge cases", "problemStatement": "Full problem description", "templates": { "javascript": "...", "typescript": "...", "python": "...", "cpp": "...", "java": "...", "go": "...", "sql": "..." } },
    { "stage": 3, "topic": "Problem 3 name", "coreIntent": "Evaluate optimization and complexity analysis", "problemStatement": "Full problem description", "templates": { "javascript": "...", "typescript": "...", "python": "...", "cpp": "...", "java": "...", "go": "...", "sql": "..." } }
  ]
}`
          }

          // CS Fundamentals & System Design
          const designStructure = (() => {
            if (role.toLowerCase().includes('analyst')) {
              return `Stage 1: Relational Schema Design (tables, keys, normalization vs denormalization)
              Stage 2: Data Warehouse design (Star vs Snowflake schemas, dimensions, facts, partitioning)
              Stage 3: Data Pipeline (ETL/ELT design, batch vs stream processing, data validation)`
            }
            if (role.toLowerCase().includes('frontend')) {
              return `Stage 1: Component Architecture & State Management (caching, infinite scroll, render loop)
              Stage 2: Browser Performance & Optimization (SSR vs CSR vs ISR, asset loading, browser storage)
              Stage 3: Client-side Security & APIs (XSS, CSRF, WebSocket vs HTTP polling, Web Workers)`
            }
            return `Stage 1: Low-level design (class design, OOP principles, design patterns)
            Stage 2: System component deep-dive (caching, queuing, database indexing, OS concepts)
            Stage 3: Scale & trade-offs (CAP theorem, consistency models, horizontal vs vertical scaling)`
          })()

          return `You are a Principal Engineer running a CS Fundamentals & System Design interview.

Candidate Profile:
- Target Role: ${role}, Difficulty: ${difficulty}
- Skills: ${JSON.stringify(skillsList)}
- Profile: ${summaryText}

Session Structure (3 stages):
${designStructure}

Generate a realistic interview session with a named interviewer at a relevant company. The "initialQuestion" must present a design problem naturally (e.g. for SDE: "Design a URL shortener"; for Frontend: "Design an autocomplete search bar"; for Data Analyst: "Design a telemetry data ingestion schema") and ask for the candidate's initial high-level thinking before any implementation.

IMPORTANT: Code comments must appear at end of line only, never inside or before closing brackets.

Return ONLY a raw JSON object:
{
  "title": "Short descriptive name",
  "initialQuestion": "Immersive design interview opener",
  "templates": {
    "javascript": "Class/function skeleton for the design problem",
    "typescript": "TypeScript skeleton",
    "python": "Python skeleton",
    "cpp": "C++ skeleton",
    "java": "Java skeleton",
    "go": "Go skeleton",
    "sql": "Schema SQL if applicable"
  },
  "agenda": [
    { "stage": 1, "topic": "Stage 1 topic", "coreIntent": "Evaluate foundational structure" },
    { "stage": 2, "topic": "Stage 2 topic", "coreIntent": "Evaluate component depth" },
    { "stage": 3, "topic": "Stage 3 topic", "coreIntent": "Evaluate scaling trade-offs" }
  ]
}`
        })()

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Interview OS',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash:free',
            messages: [{ role: 'user', content: generatorPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7
          })
        })

        if (response.ok) {
          const resData = await response.json()
          const rawContent = resData.choices?.[0]?.message?.content || '{}'
          const parsed = extractJson(rawContent)
          if (parsed && parsed.templates && parsed.initialQuestion && parsed.agenda) {
            agenda = parsed.agenda
            agenda[0].templates = parsed.templates
            agenda[0].initialCode = parsed.templates.javascript || parsed.templates.typescript || parsed.templates.python || ''
            initialQuestion = parsed.initialQuestion
          }
        }
      } catch (genErr) {
        console.error('Failed to dynamically generate interview question:', genErr)
      }
    }


    const title = `${role} Mock (${type})`

    // 2.5 Ensure the user only has a maximum of 5 interviews (delete oldest if limit exceeded)
    try {
      const { data: existingInterviews } = await supabase
        .from('interviews')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }) // Oldest first

      if (existingInterviews && existingInterviews.length >= 5) {
        const deleteCount = existingInterviews.length - 4 // leave room for 4, so the new one makes 5
        const idsToDelete = existingInterviews.slice(0, deleteCount).map(i => i.id)
        
        const { error: deleteError } = await supabase
          .from('interviews')
          .delete()
          .in('id', idsToDelete)

        if (deleteError) {
          console.error('Failed to clean up oldest interviews:', deleteError)
        }
      }
    } catch (cleanupErr) {
      console.error('Error during oldest interviews cleanup check:', cleanupErr)
    }

    // 3. Create interview row
    const { data: interview, error: dbError } = await supabase
      .from('interviews')
      .insert({
        user_id: user.id,
        title,
        role,
        difficulty,
        type,
        status: 'active',
        agenda
      })
      .select()
      .single()

    if (dbError) throw dbError

    // 4. Create initial interviewer question message
    const { error: msgError } = await supabase
      .from('interview_messages')
      .insert({
        interview_id: interview.id,
        sender: 'interviewer',
        message_text: initialQuestion
      })

    if (msgError) throw msgError

    return NextResponse.json({ interviewId: interview.id })
  } catch (err: any) {
    console.error('Failed to initiate interview:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
