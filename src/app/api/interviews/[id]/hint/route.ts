import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { chatHistory, codeState } = await request.json()
    const apiKey = process.env.OPENROUTER_API_KEY

    // Fallback response if API key is missing
    if (!apiKey || apiKey.includes('sk-or-v1-...')) {
      return NextResponse.json({
        hint: "Inspect the concurrency timing. If userId records are deleted and created async, what happens if another request accesses the userSessions map during the cleanUp yield?"
      })
    }

    // Call OpenRouter for a prompt hint
    const systemPrompt = `You are a Principal Engineer helping a candidate during a coding mock.
Give a brief, subtle, 1-2 sentence hint about safety flaws, performance anomalies, or code cleanliness in their current editor code state:
\n${codeState}\n
Do NOT solve the problem for them. Be encouraging but cryptic enough to make them think.`

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
          ...chatHistory.map((m: any) => ({
            role: m.sender === 'interviewer' ? 'assistant' : 'user',
            content: m.message_text
          })),
          { role: 'user', content: 'Can I get a quick, subtle hint about what I should modify next in this code?' }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    })

    if (!response.ok) {
      throw new Error('OpenRouter hint generation failed')
    }

    const data = await response.json()
    const hint = data.choices?.[0]?.message?.content || 'Think about runtime complexity bounds and potential null pointer inputs.'

    return NextResponse.json({ hint })
  } catch (err: any) {
    console.error('Hint API failed:', err)
    return NextResponse.json({ hint: 'Think about database indexes or connection pooling parameters.' })
  }
}
