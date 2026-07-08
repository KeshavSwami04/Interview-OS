import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let chatHistory: any[] = []
  let codeState = ''
  let interviewContext: any = null

  try {
    const body = await request.json()
    chatHistory = body.chatHistory || []
    codeState = body.codeState || ''
    interviewContext = body.interviewContext || {}
  } catch (e) {
    console.error('Failed to parse hint body:', e)
  }

  const {
    title = 'Technical Challenge',
    type = 'DSA Sandbox',
    role = 'Software Engineer',
    difficulty = 'medium',
    agenda = [],
    currentLanguage = 'javascript'
  } = interviewContext || {}

  const apiKey = process.env.OPENROUTER_API_KEY

  try {
    const currentStage = agenda?.[0]?.topic || 'Implementation'
    const coreIntent = agenda?.[0]?.coreIntent || 'Evaluate code structure'

    // Most recent interviewer question for targeted hint
    const lastInterviewerMessage = [...(chatHistory || [])]
      .reverse()
      .find((m: any) => m.sender === 'interviewer')?.message_text || ''

    // Fallback response if API key is missing
    if (!apiKey || apiKey.includes('sk-or-v1-...')) {
      const fallbackHint = (() => {
        if (type === 'Behavioral & HR Round' || type === 'Resume Grill') {
          return `Think about how you can structure your response using the STAR framework. What was the exact bottleneck, what actions did you personally take, and what was the quantifiable result?`
        }
        if (type === 'Live PR Critique') {
          return `Look closely at the PR changes. Is there a race condition, resource leak, or security issue? Think about what happens under concurrent load.`
        }
        if (type === 'CS Fundamentals & System Design') {
          return `Focus on system boundaries, latency bounds, and scaling trade-offs. What happens when the read-to-write ratio shifts dramatically?`
        }
        return `You are working on "${title}". Think carefully about the data structure that lets you achieve O(1) lookups. What structure gives constant-time access AND preserves insertion order?`
      })()
      return NextResponse.json({ hint: fallbackHint })
    }

    const systemPrompt = `You are a Principal Software Engineer giving a subtle, targeted clue to a candidate stuck during a mock interview.

Session Details:
- Problem: ${title}
- Interview Type: ${type}
- Role: ${role}
- Difficulty: ${difficulty}
- Current Stage: ${currentStage} (Goal: ${coreIntent})
- Language in use: ${currentLanguage}

Most recent interviewer question (what the candidate is currently trying to answer):
"${lastInterviewerMessage}"

Current code in the editor:
\`\`\`${currentLanguage}
${codeState}
\`\`\`

Rules for your hint:
1. Be specific and directly relevant to the problem "${title}" and the stage "${currentStage}".
2. Do NOT give away the solution, the answer, or rewrite their code. A hint directs thinking, not execution.
3. Target the most impactful gap visible in their current code state above.
4. If their code is blank or has only stubs, hint toward what data structure or algorithm family is most suitable for this problem type.
5. If their code has a bug, hint at the category of the bug (e.g. "Consider off-by-one boundaries" or "Think about what happens when the input array is empty").
6. Keep the hint to 1-2 sentences maximum.
7. Frame it as a thought-provoking question or a conceptual nudge, not a direct instruction.
8. Never ask an impossible question — all hints must correspond to a realistically implementable solution.`

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
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Give me a targeted, problem-specific hint for what I should think about next.' }
        ],
        temperature: 0.5,
        max_tokens: 120
      })
    })

    if (!response.ok) {
      throw new Error('OpenRouter hint generation failed')
    }

    const data = await response.json()
    const fallbackHint = (() => {
      if (type === 'Behavioral & HR Round' || type === 'Resume Grill') {
        return `Formulate your answer using the STAR method. Describe the situation, your specific role, and the numerical impact of your actions.`
      }
      if (type === 'Live PR Critique') {
        return `Analyze code safety, resource lifecycles, or thread-safety under load. Look for edge case vulnerabilities.`
      }
      if (type === 'CS Fundamentals & System Design') {
        return `Consider cache invalidation, DB indexing, or single-points-of-failure in your system layout.`
      }
      return `For "${title}", consider which data structure would let you track elements you have already seen in constant time.`
    })()

    const hint = data.choices?.[0]?.message?.content || fallbackHint

    return NextResponse.json({ hint })
  } catch (err: any) {
    console.error('Hint API failed:', err)
    const errorFallbackHint = (() => {
      if (type === 'Behavioral & HR Round' || type === 'Resume Grill') {
        return `Focus on structuring your experience. Emphasize your personal contribution, how you collaborated, and what you learned.`
      }
      if (type === 'Live PR Critique') {
        return `Review the code stubs for concurrency, edge-case safety, or memory management. How would you refactor it?`
      }
      if (type === 'CS Fundamentals & System Design') {
        return `Think about component separation, caching layers, and database scaling constraints.`
      }
      return 'Think about what information you need to remember between loop iterations, and which data structure gives you the fastest lookup for that information.'
    })()
    return NextResponse.json({ hint: errorFallbackHint })
  }
}
