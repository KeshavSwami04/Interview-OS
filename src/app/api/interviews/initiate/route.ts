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
      initialQuestion = `Hello. Let's do a live PR critique on your repository: "${repoName}". I've pulled a core connection function shown on the right.\n\nIf two clients call handleUserAccess concurrently for the same userId, we have a race condition due to the asynchronous timeout block. Explain how this race condition manifests, and refactor the script in the Monaco editor to guarantee concurrency safety.`
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
      initialQuestion = `Hello. Let's do a CS Fundamentals & System Design interview. Look at the LRU Cache template in the editor on the right.\n\nExplain how you can design an LRU Cache to guarantee O(1) runtime complexity for both read (get) and write (put) operations. What underlying data structures (such as Doubly Linked List, Hash Map) are needed, and how do you ensure thread-safety and avoid race conditions under concurrent workloads?`
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
      initialQuestion = `Welcome. We're going to cover typical algorithms and system constraints. Take a look at the duplicate lookup function in the editor on the right.\n\nExplain how you can solve this duplicate array numbers lookup with O(N) runtime complexity and O(1) helper space if numbers are bounded between 1 and n.`
    }


    // 2. Invoke Unified AI Question Generator (if API Key is configured)
    const apiKey = process.env.OPENROUTER_API_KEY
    if (apiKey && !apiKey.includes('sk-or-v1-...')) {
      try {
        const skillsList = profile?.profile_summary?.skills || []
        const summaryText = profile?.profile_summary?.summary || ''
        const reposList = profile?.github_summary?.selectedRepos || []

        const generatorPrompt = `You are a Principal Software Engineer designing a coding/technical mock interview challenge for a candidate.
        Target Role: ${role}
        Difficulty: ${difficulty}
        Round Type: ${type}
        Resume Skills: ${JSON.stringify(skillsList)}
        Profile Summary: ${summaryText}
        GitHub Projects: ${JSON.stringify(reposList.map((r: any) => ({ name: r.name, summary: r.analyzedSummary })))}

        Configure the challenge based on the Round Type:
        1. "Live PR Critique": Create a realistic code snippet representing a common concurrency bug, data race, or logic vulnerability in their primary language stack. Provide skeleton code containing the flaw.
        2. "CS Fundamentals & System Design": Design a technical challenge covering CS fundamentals (such as OOP class design, caching policies like LRU, TCP/Socket networking, OS process threading, or system APIs) in their primary programming language.
        3. "Resume Grill": Generate a custom coding prompt derived directly from engineering projects/skills in their profile.
        4. "General DSA Mock" (or any other type): Design a classic DSA problem (graphs, binary search, sliding window, arrays) formatted skeleton code in their primary programming language.

        Task details:
        - Select the programming language most appropriate for their skills list.
        - Provide initial skeleton code templates translated into JavaScript, TypeScript, Python, C++, Java, Go, and SQL (if applicable) matching the same problem signatures.
        - IMPORTANT: Do NOT place code comments (like // Expected: value) inside or before closing parentheses/brackets/semicolons on the same line, as this comments them out and causes syntax/compile errors. Always place comments at the very end of the line (e.g. use 'console.log(func(arg)); // Expected: val').
        - Outline a 3-stage agenda (concept walkthrough, implementation, review/edge cases).
        - Write a friendly, detailed welcoming question introducing the challenge topic and asking the first conceptual question.


        Return ONLY a raw JSON object matching this schema exactly (do not output any other text or markdown code blocks):
        {
          "title": "Short descriptive name of the challenge",
          "initialQuestion": "Detailed welcoming message explaining the problem statement, constraints, and instructions",
          "templates": {
            "javascript": "Skeleton code translated in JavaScript",
            "typescript": "Skeleton code translated in TypeScript",
            "python": "Skeleton code translated in Python",
            "cpp": "Skeleton code translated in C++ (cpp)",
            "java": "Skeleton code translated in Java",
            "go": "Skeleton code translated in Go",
            "sql": "Skeleton code translated in SQL (if applicable, else empty)"
          },
          "agenda": [
            { "stage": 1, "topic": "Conceptual Approach", "coreIntent": "Evaluate logical planning" },
            { "stage": 2, "topic": "Coding Implementation", "coreIntent": "Evaluate code structure" },
            { "stage": 3, "topic": "Scale & Edge Cases", "coreIntent": "Evaluate resilience" }
          ]
        }`

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Interview OS',
          },
          body: JSON.stringify({
            model: 'openrouter/free',
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
