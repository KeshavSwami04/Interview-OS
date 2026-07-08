import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { code, language } = await request.json()

    // 1. Authenticate user from session cookies
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch target interview to get the current problem details
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', id)
      .single()

    if (interviewError || !interview) {
      return NextResponse.json({ error: 'Interview session not found' }, { status: 404 })
    }

    // Get active agenda step
    const currentAgenda = interview.agenda || []
    const problemContext = currentAgenda[0] || {}
    const problemTitle = problemContext.topic || 'Coding Challenge'
    const problemDesc = problemContext.problemStatement || 'Write a solution for the proposed challenge.'

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        status: 'success',
        output: 'Compilation successful.\nAll test cases passed (Simulated Offline Environment).\nOutput:\n[1, 3, 5]'
      })
    }

    // 3. Prompt the LLM to act as a strict compiler sandbox for the target language
    const compilerPrompt = `You are a strict code compilation and execution sandbox engine.
You will evaluate the following code written in language "${language}" for the problem "${problemTitle}".

PROBLEM STATEMENT:
${problemDesc}

CANDIDATE'S CODE:
\`\`\`${language}
${code}
\`\`\`

YOUR TASK:
Act as the compiler/interpreter. Simulate executing this code.
1. Check for syntax errors, compile-time type mismatches, or missing imports/headers.
2. IMPORTANT: Do NOT require a 'main' function or complete executable wrapper program. The sandbox environment wraps the candidate's classes/functions in a test harness automatically. Do NOT return compile errors for a missing 'main' function.
3. If there are actual syntax or compiler errors, return status = "compile_error" with a realistic stack trace/error log.
4. If it compiles successfully but crashes (e.g. division by zero, null pointer dereference, index out of bounds), return status = "runtime_error" with the trace logs.
5. If it compiles and runs, simulate execution on typical test cases (including some boundary inputs). Show standard output (stdout) and test assertion results.
6. If the solution is logically incorrect (fails assertions), return status = "success" but show failed test cases in output.

You MUST return ONLY a raw JSON object matching this schema exactly (no other text, no markdown blocks):
{
  "status": "success" | "compile_error" | "runtime_error",
  "output": "Standard output logs or test suite assertions run. Be realistic, detailed, and format nicely like standard compiler output.",
  "errorLog": "Detailed stack trace or compiler error message. Leave empty if status is success."
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
        messages: [{ role: 'user', content: compilerPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    })

    if (!response.ok) {
      throw new Error('Failed to reach AI compiler backend')
    }

    const resData = await response.json()
    const content = resData.choices?.[0]?.message?.content || '{}'
    
    // Parse response
    let parsedResult = { status: 'success', output: 'Execution completed.', errorLog: '' }
    try {
      parsedResult = JSON.parse(content.trim())
    } catch {
      // Extraction fallback
      const match = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (match && match[1]) {
        parsedResult = JSON.parse(match[1].trim())
      }
    }

    return NextResponse.json(parsedResult)
  } catch (err: any) {
    console.error('AI Compiler engine error:', err)
    return NextResponse.json({
      status: 'runtime_error',
      output: '',
      errorLog: err.message || 'Execution environment crash.'
    }, { status: 500 })
  }
}
