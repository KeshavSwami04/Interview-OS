import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { chatHistory, codeState, interviewContext } = await request.json()
    const apiKey = process.env.OPENROUTER_API_KEY

    const {
      title = 'Technical Challenge',
      type = 'DSA Sandbox',
      role = 'Software Engineer',
      difficulty = 'medium',
      agenda = [],
      currentLanguage = 'javascript'
    } = interviewContext || {}

    // Derive current stage from agenda
    const currentStage = agenda?.[0]?.topic || 'Implementation'
    const coreIntent = agenda?.[0]?.coreIntent || 'Evaluate code structure'

    // Most recent interviewer question for targeted hint
    const lastInterviewerMessage = [...(chatHistory || [])]
      .reverse()
      .find((m: any) => m.sender === 'interviewer')?.message_text || ''

    // Fallback response if API key is missing
    if (!apiKey || apiKey.includes('sk-or-v1-...')) {
      return NextResponse.json({
        hint: `You are working on "${title}". Think carefully about the data structure that lets you achieve O(1) lookups. What structure gives constant-time access AND preserves insertion order?`
      })
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
    const hint = data.choices?.[0]?.message?.content || 
      `For "${title}", consider which data structure would let you track elements you have already seen in constant time.`

    return NextResponse.json({ hint })
  } catch (err: any) {
    console.error('Hint API failed:', err)
    return NextResponse.json({ 
      hint: 'Think about what information you need to remember between loop iterations, and which data structure gives you the fastest lookup for that information.' 
    })
  }
}
