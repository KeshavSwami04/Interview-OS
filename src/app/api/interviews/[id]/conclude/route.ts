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

    // Pre-compute participation metrics to anchor scoring in reality
    const candidateMessages = messages.filter((m: any) => m.sender === 'candidate')
    const interviewerMessages = messages.filter((m: any) => m.sender === 'interviewer')
    const totalCandidateWords = candidateMessages.reduce((acc: number, m: any) => acc + (m.message_text?.split(' ')?.length || 0), 0)
    const hasCodeSubmission = candidateMessages.some((m: any) => m.code_submission && m.code_submission.trim().length > 30)
    const hasSubstantiveAnswers = candidateMessages.some((m: any) => (m.message_text?.split(' ')?.length || 0) > 20)

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
      // Direct call to OpenRouter to evaluate the transcript
      const evaluationPrompt = `You are a senior engineering hiring manager evaluating a candidate's mock technical interview. Your job is to provide an HONEST, CALIBRATED score. Do NOT inflate scores — a poor performance should score poorly.

PARTICIPATION METRICS (computed from transcript):
- Total candidate responses: ${candidateMessages.length} (out of ${interviewerMessages.length} interviewer questions)
- Total words written by candidate: ${totalCandidateWords}
- Did the candidate write meaningful code (>30 chars): ${interview.type === 'DSA Sandbox' || interview.type === 'Live PR Critique' ? (hasCodeSubmission ? 'YES' : 'NO — penalize technical score heavily') : 'N/A (Code not expected for this interview type)'}
- Did the candidate give substantive answers (>20 words per answer): ${hasSubstantiveAnswers ? 'YES' : 'NO — penalize communication score heavily'}
- Interview type: ${interview.type}
- Interview difficulty: ${interview.difficulty}
- Target role: ${interview.role}

FULL TRANSCRIPT:
${JSON.stringify(messages.map((m: any) => ({ sender: m.sender, text: m.message_text, code: m.code_submission })))}

SCORING RUBRIC — apply these STRICTLY:
- 90-100: Exceptional. Candidate answered all questions correctly, explained complexity, handled edge cases, and showed depth. (If DSA Sandbox or Live PR Critique: also wrote clean working code).
- 75-89: Strong. Answered most questions correctly with minor gaps. (If DSA Sandbox or Live PR Critique: code works but has some issues).
- 60-74: Adequate. Got the general approach but made notable mistakes. (If DSA Sandbox or Live PR Critique: code is partial or has bugs).
- 40-59: Weak. Struggled significantly. Answered only 1-2 questions superficially.
- 20-39: Very poor. Barely participated. Answered nothing meaningfully.
- 0-19: Did not participate. Candidate gave no real answers and submitted no code (if coding was required).

PENALTIES (apply these before scoring):
- If candidate wrote fewer than 2 substantive responses: subtract 30 from all scores.
- If no meaningful code was submitted (ONLY applicable to DSA Sandbox and Live PR Critique): cap technical score at 45.
- If candidate answered 0 or 1 questions: overall score MUST be below 50.
- If total candidate words < 50: overall score MUST be below 40.
- Never give an overall score above 60 if the candidate quit early or barely engaged.

Generate specific strengths and weaknesses that reference ACTUAL content from the transcript. Do NOT generate generic feedback. If the candidate did not participate enough to evaluate, state that explicitly in weaknesses.

Return ONLY a JSON object with this schema (no roadmap needed here):
{
  "scorecard": {
    "overall": <integer 0-100>,
    "communication": <integer 0-100>,
    "problemSolving": <integer 0-100>,
    "technical": <integer 0-100>,
    "strengths": ["quote or paraphrase from the actual session", "..."],
    "weaknesses": ["specific gap observed in the session", "..."]
  }
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
          model: 'google/gemini-2.5-flash:free',
          messages: [{ role: 'user', content: evaluationPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      })

      if (response.ok) {
        const data = await response.json()
        const contentStr = data.choices?.[0]?.message?.content || '{}'
        const parsed = extractJson(contentStr) || {}
        scorecard = parsed.scorecard || null
      }

      // --- Second focused call: generate a targeted study roadmap ---
      // Extract the actual questions asked and mistakes made from the transcript
      const interviewerQs = interviewerMessages.map((m: any) => m.message_text).join('\n\n---\n\n')
      const candidateAnswers = candidateMessages.map((m: any) =>
        `Answer: ${m.message_text}${m.code_submission ? `\nCode submitted:\n${m.code_submission}` : ''}`
      ).join('\n\n---\n\n')

      const roadmapPrompt = `You are a senior engineering mentor. A candidate just completed a ${interview.type} mock interview for a ${interview.role} position at ${interview.difficulty} difficulty.

WHAT THE INTERVIEWER ASKED (these are the EXACT questions/topics covered in this session):
${interviewerQs}

WHAT THE CANDIDATE SAID AND CODED:
${candidateAnswers}

WEAKNESSES IDENTIFIED (from scorecard):
${scorecard ? JSON.stringify(scorecard.weaknesses) : 'See transcript above'}

Your task: Generate a PERSONALIZED study roadmap of 3-5 items. Each item MUST:
1. Directly address a SPECIFIC gap observed in THIS session — not generic advice
2. Reference the exact concept, algorithm, or system component that came up in the interview above
3. Name what the candidate got wrong or incomplete, and what they should study to fix it
4. Include a real, working URL to a documentation page, tutorial, or authoritative resource (e.g. MDN, GeeksforGeeks, CS50, LeetCode editorial, PostgreSQL docs, DDIA book chapter)
5. Describe a concrete action: "Practice writing X", "Read the chapter on Y", "Implement Z from scratch"

Do NOT generate items for topics NOT discussed in this session.
Do NOT add generic items like "study algorithms" or "practice coding" — every item must be traceable back to a specific moment in the transcript above.

Return ONLY a JSON object:
{
  "roadmap": [
    {
      "id": 1,
      "title": "Specific concept to master (name it precisely)",
      "topic": "Category (e.g. Dynamic Programming, Concurrency, System Design)",
      "desc": "Exactly what to do: e.g. 'Implement a sliding window solution for longest subarray problems — you defaulted to brute force O(N²) when O(N) was available'",
      "resource": "https://... (real working URL)"
    }
  ]
}`

      const roadmapResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Interview OS',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash:free',
          messages: [{ role: 'user', content: roadmapPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.4
        })
      })

      if (roadmapResponse.ok) {
        const roadmapData = await roadmapResponse.json()
        const roadmapStr = roadmapData.choices?.[0]?.message?.content || '{}'
        const roadmapParsed = extractJson(roadmapStr) || {}
        roadmap = roadmapParsed.roadmap || null
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

    // 4. Server-side deterministic score enforcement — safety net in case LLM ignores rubric
    if (scorecard) {
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v)))
      const totalCandidateResponses = candidateMessages.length
      const isZeroParticipation = totalCandidateWords < 30
      const isMinimalParticipation = totalCandidateResponses <= 1 || totalCandidateWords < 60

      if (isZeroParticipation) {
        // Candidate essentially did nothing
        scorecard.overall       = clamp(scorecard.overall, 0, 25)
        scorecard.communication = clamp(scorecard.communication, 0, 20)
        scorecard.problemSolving = clamp(scorecard.problemSolving, 0, 25)
        scorecard.technical     = clamp(scorecard.technical, 0, 20)
      } else if (isMinimalParticipation) {
        // Only 1 or very short response — hard cap at 50
        scorecard.overall       = clamp(scorecard.overall, 0, 50)
        scorecard.communication = clamp(scorecard.communication, 0, 45)
        scorecard.problemSolving = clamp(scorecard.problemSolving, 0, 50)
        scorecard.technical     = clamp(scorecard.technical, 0, 45)
      }

      if (!hasCodeSubmission && (interview.type === 'DSA Sandbox' || interview.type === 'Live PR Critique')) {
        // No meaningful code written — cap technical regardless (only for coding rounds)
        scorecard.technical = clamp(scorecard.technical, 0, 45)
      }

      // Recalculate overall as weighted average if sub-scores changed significantly
      const computedOverall = Math.round(
        scorecard.technical * 0.35 +
        scorecard.problemSolving * 0.35 +
        scorecard.communication * 0.30
      )
      // If the LLM overall is suspiciously higher than what the sub-scores justify, correct it
      if (scorecard.overall > computedOverall + 15) {
        scorecard.overall = computedOverall
      }
    }

    // 5. Update the interview session record status, scorecard, and roadmap in Supabase
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
