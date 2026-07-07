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

export async function POST(

  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch target interview and transcript messages
    const { data: interview, error: intError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (intError || !interview) {
      return NextResponse.json({ error: 'Interview mock workspace not found' }, { status: 404 })
    }

    const { data: messages, error: msgError } = await supabase
      .from('interview_messages')
      .select('*')
      .eq('interview_id', id)
      .order('created_at', { ascending: true })

    if (msgError || !messages || messages.length === 0) {
      return NextResponse.json({ error: 'No transcript messages found to evaluate' }, { status: 400 })
    }

    // 3. Invoke OpenRouter Evaluator Agent
    const apiKey = process.env.OPENROUTER_API_KEY
    let scorecard = null
    let roadmap = null

    // Helper: Mock fallback evaluation data if API key is not configured
    if (!apiKey || apiKey.includes('sk-or-v1-...')) {
      scorecard = {
        overall: 82,
        communication: 78,
        problemSolving: 85,
        technical: 83,
        strengths: [
          "Identified the concurrency race condition within handleUserAccess accurately.",
          "Effectively discussed potential async database cleanup delays.",
          "Demonstrated solid familiarity with JavaScript execution threads."
        ],
        weaknesses: [
          "Missed locking the access lock key during validation steps.",
          "Vague on clean connection closure in the database pool."
        ]
      }
      roadmap = [
        {
          id: 1,
          title: "JavaScript Lock Implementations",
          topic: "Concurrency",
          desc: "Read MDN guides on async scheduling and mutex patterns in Node.js.",
          resource: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise"
        },
        {
          id: 2,
          title: "Database Transaction Isolation Levels",
          topic: "DBMS",
          desc: "Study Read Committed vs Serializable concurrency controls.",
          resource: "https://www.postgresql.org/docs/current/transaction-iso.html"
        }
      ]
    } else {
      // Direct call to OpenRouter Gemini Flash to evaluate the transcript
      const evaluationPrompt = `You are a Principal Engineer evaluating a candidate's mock interview performance.
Review the following complete chat transcript and final code state:
\n${JSON.stringify(messages.map(m => ({ sender: m.sender, text: m.message_text, code: m.code_submission })))}\n

Based on their answers and refactoring quality:
1. Grade them from 0 to 100 on overall, communication, problemSolving, and technical scores.
2. Outline specific strengths and weaknesses (2-3 items each).
3. Generate a structured 2-3 step learning roadmap targeting their exact weaknesses.

You MUST return ONLY a JSON object conforming exactly to this schema:
{
  "scorecard": {
    "overall": 80,
    "communication": 75,
    "problemSolving": 85,
    "technical": 80,
    "strengths": ["Identified race condition", "Clean code patterns"],
    "weaknesses": ["Vague on transaction isolation", "Missed error boundary validation"]
  },
  "roadmap": [
    {
      "id": 1,
      "title": "Topic name",
      "topic": "Category",
      "desc": "Short actionable description of what to study",
      "resource": "MDN/PostgreSQL documentation url"
    }
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
          messages: [{ role: 'user', content: evaluationPrompt }],

          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      })

      if (response.ok) {
        const data = await response.json()
        const contentStr = data.choices?.[0]?.message?.content || '{}'
        const parsed = extractJson(contentStr) || {}
        scorecard = parsed.scorecard
        roadmap = parsed.roadmap
      }

    }

    // Double check fallback values if JSON parsing failed
    if (!scorecard || !roadmap) {
      scorecard = {
        overall: 70,
        communication: 70,
        problemSolving: 70,
        technical: 70,
        strengths: ["Participated in mock review loop."],
        weaknesses: ["Requires further deep conceptual practice."]
      }
      roadmap = [
        {
          id: 1,
          title: "General Tech Prep",
          topic: "Review",
          desc: "Go through core concepts discussed during this mock again.",
          resource: "https://nextjs.org/docs"
        }
      ]
    }

    // 4. Update the interview session record status, scorecard, and roadmap in Supabase
    const { error: updateError } = await supabase
      .from('interviews')
      .update({
        status: 'completed',
        scorecard,
        roadmap,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Conclude Session API error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
