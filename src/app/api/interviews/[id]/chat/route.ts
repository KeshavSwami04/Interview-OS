import { createServerClient } from '@supabase/ssr'
import { getOpenRouterStream } from '@/lib/agents/openrouter'

export const runtime = 'edge'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { messageText, code } = await request.json()

    // Parse request cookies for Supabase SSR context in Edge runtime
    const cookieHeader = request.headers.get('Cookie') || ''
    const parsedCookies = cookieHeader.split(';').map(c => {
      const parts = c.trim().split('=')
      return { name: parts[0], value: parts.slice(1).join('=') }
    }).filter(c => c.name && c.value)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return parsedCookies
          },
          setAll() {}
        }
      }
    )

    // Authenticate candidate user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user session' }), { status: 401 })
    }


    // 1. Log the candidate response turn in history
    const { error: insertUserError } = await supabase
      .from('interview_messages')
      .insert({
        interview_id: id,
        sender: 'candidate',
        message_text: messageText,
        code_submission: code
      })

    if (insertUserError) {
      return new Response(JSON.stringify({ error: insertUserError.message }), { status: 500 })
    }

    // 2. Fetch full chronological message transcript
    const { data: messages, error: fetchError } = await supabase
      .from('interview_messages')
      .select('*')
      .eq('interview_id', id)
      .order('created_at', { ascending: true })

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 })
    }

    // 3. Fetch interview metadata (role, difficulty, targets)
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', id)
      .single()

    if (interviewError || !interview) {
      return new Response(JSON.stringify({ error: 'Interview mock workspace not found' }), { status: 404 })
    }

    // 4. Configure agent prompt for the interviewer role
    const systemPrompt = `You are a Principal Software Engineer conducting a mock interview for a ${interview.role} role (Difficulty: ${interview.difficulty}).
Focus of mock session: ${interview.type}.
The planned agenda is: ${JSON.stringify(interview.agenda)}.

Conduct the interview conversationally:
- Review the code state in the editor: \n${code}\n.
- Point out race conditions, security vulnerabilities, database anomalies, or algorithmic inefficiencies in their code and comments.
- Ask target follow-up questions challenging their choices. Polite but firm.
- Keep your response brief (under 3 paragraphs) and end with exactly one question.
Do not write refactored code blocks for them. Use snippets only to outline structural logic.`

    // Format chat payload for OpenRouter
    const chatHistory = [
      { role: 'system', content: systemPrompt },
      ...(messages || []).map((m: any) => ({
        role: m.sender === 'interviewer' ? 'assistant' : 'user',
        content: m.code_submission 
          ? `Code context in editor:\n${m.code_submission}\n\nCandidate response:\n${m.message_text}`
          : m.message_text
      }))
    ]

    // 5. OpenRouter streaming completions
    const openRouterStream = await getOpenRouterStream(chatHistory)

    if (!openRouterStream) {
      return new Response(JSON.stringify({ error: 'OpenRouter stream body is null' }), { status: 500 })
    }

    const reader = openRouterStream.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    let fullText = ''
    let buffer = ''

    const clientStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              // Once the stream terminates, write the complete interviewer reply to the database asynchronously
              if (fullText.trim()) {
                (async () => {
                  try {
                    const { error: dbErr } = await supabase
                      .from('interview_messages')
                      .insert({
                        interview_id: id,
                        sender: 'interviewer',
                        message_text: fullText
                      })
                    if (dbErr) {
                      console.error('Failed to log streamed interviewer reply:', dbErr.message)
                    }
                  } catch (dbErr) {
                    console.error('Failed to log streamed interviewer reply:', dbErr)
                  }
                })()
              }
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk

            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed) continue
              if (trimmed.startsWith(':')) continue
              if (trimmed === 'data: [DONE]') continue

              if (trimmed.startsWith('data: ')) {
                try {
                  const json = JSON.parse(trimmed.slice(6))
                  const content = json.choices?.[0]?.delta?.content || ''
                  if (content) {
                    fullText += content
                    controller.enqueue(encoder.encode(content))
                  }
                } catch (e) {
                  // Ignore JSON parsing errors for partial/malformed lines
                }
              } else {
                // Handle raw text fallback (mock stream compatibility)
                fullText += trimmed + '\n'
                controller.enqueue(encoder.encode(trimmed + '\n'))
              }
            }
          }
        } catch (err) {
          console.error('Stream processing loop error:', err)
        } finally {
          controller.close()
          reader.releaseLock()
        }
      }
    })

    return new Response(clientStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })


  } catch (err: any) {
    console.error('Edge API streaming failure:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
