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

    // Fetch candidate profile summary and resume context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', interview.user_id)
      .single()

    // 4. Build immersive interviewer persona based on track + difficulty
    type PersonaKey = 'DSA Sandbox' | 'CS Fundamentals & System Design' | 'Live PR Critique' | 'Resume Grill' | 'Behavioral & HR Round'
    type DifficultyKey = 'easy' | 'medium' | 'hard' | 'faang'
    interface Persona { name: string; company: string; title: string; style: string }

    const personaMap: Record<PersonaKey, Record<DifficultyKey, Persona>> = {
      'DSA Sandbox': {
        easy:   { name: 'Rahul Sharma',  company: 'Flipkart',   title: 'SDE-2',              style: 'encouraging but structured. Guide the candidate step by step — brute force first, then optimization. Give them space to think aloud.' },
        medium: { name: 'Ankit Verma',   company: 'Amazon',     title: 'SDE-2',              style: 'direct and time-conscious. Working code first, then ask "can we do better?". You follow Amazon LP values — bias for action, deliver results.' },
        hard:   { name: 'Priya Nair',    company: 'Microsoft',  title: 'SDE-3',              style: 'probing and systematic. Push candidates to reason about edge cases, overflow, empty inputs, and concurrent access before they start coding.' },
        faang:  { name: 'Sanjay Mehta',  company: 'Google',     title: 'Staff Engineer',     style: 'rigorous and abstract. Expect candidates to prove correctness, analyze amortized complexity, and reason about worst-case inputs. Clean production-grade code only.' },
      },
      'CS Fundamentals & System Design': {
        easy:   { name: 'Sneha Gupta',   company: 'Infosys',    title: 'Technology Lead',    style: 'patient and conceptual. Explain what you are evaluating after each question. Appreciate reasoning from first principles.' },
        medium: { name: 'Vikram Patel',  company: 'Microsoft',  title: 'SDE-3',              style: 'methodical. OS fundamentals, memory, networking, OOP design. Expect candidates to describe system components clearly before touching code.' },
        hard:   { name: 'Arjun Reddy',   company: 'Adobe',      title: 'Senior Engineer',    style: 'deep-dive oriented. Follow every answer with a "why" until the candidate has explained down to the lowest abstraction level they can reach.' },
        faang:  { name: 'Meera Kapoor',  company: 'Google',     title: 'Principal Engineer', style: 'systems-focused and unrelenting. Push distributed systems, CAP theorem, consistency models, and scalability under failure scenarios.' },
      },
      'Live PR Critique': {
        easy:   { name: 'Rohan Singh',   company: 'Startup',    title: 'Tech Lead',          style: 'collaborative code reviewer. Explain what you are looking for — readability, safety, maintainability. Help them see good PR standards.' },
        medium: { name: 'Aditya Kumar',  company: 'Atlassian',  title: 'Senior Engineer',    style: 'standards-driven. Thread safety, error handling, idiomatic code. You reference real code review norms.' },
        hard:   { name: 'Deepa Sharma',  company: 'Flipkart',   title: 'SDE-3',              style: 'adversarial but fair. Challenge every design decision, ask why they chose this pattern over alternatives, surface non-obvious bugs.' },
        faang:  { name: 'Kartik Iyer',   company: 'Meta',       title: 'Staff Engineer',     style: 'demanding. Expect candidates to identify data races, security vulnerabilities, and scalability bottlenecks unprompted. Silence signals a failed review.' },
      },
      'Resume Grill': {
        easy:   { name: 'Pooja Mehta',   company: 'TCS',        title: 'HR Manager',         style: 'warm but evaluative. Ask about projects in practical terms and probe whether the candidate built what they claimed.' },
        medium: { name: 'Nisha Reddy',   company: 'Wipro',      title: 'Engineering Manager',style: 'project-depth focused. Walk through architecture decisions, why specific frameworks were chosen, and what they would do differently.' },
        hard:   { name: 'Varun Joshi',   company: 'Razorpay',   title: 'Senior EM',          style: 'cross-functional and exacting. Expect candidates to quantify impact, explain scaling decisions, and handle failure scenarios from their projects.' },
        faang:  { name: 'Anjali Bose',   company: 'Amazon',     title: 'Bar Raiser',         style: 'relentless. Every answer triggers a deeper "tell me more." Looking for ownership, judgment under ambiguity, and measurable outcomes.' },
      },
      'Behavioral & HR Round': {
        easy:   { name: 'Kunal Sen',     company: 'Cognizant',  title: 'HR Lead',            style: 'standard behavioral interviewing. Focus on basic fit, career goals, strengths/weaknesses, and general company values.' },
        medium: { name: 'Shreya Roy',    company: 'Infosys',    title: 'Senior Talent Manager', style: 'STAR-based recruiter. Probe deeply into teamwork, conflict resolution, dealing with feedback, and ambiguous situations.' },
        hard:   { name: 'Rohan Deshmukh',company: 'Google',     title: 'People Operations Lead', style: 'Googleyness & Leadership evaluator. Expect structured responses (STAR framework). Look for systemic thinking, bias action, humility, and positive leadership.' },
        faang:  { name: 'Amit Verma',    company: 'Amazon',     title: 'Principal Bar Raiser', style: 'Amazon Leadership Principles expert. Challenge candidate behaviors against strict ownership, earn trust, disagree & commit, and customer obsession.' },
      },
    }

    const trackKey = (interview.type in personaMap ? interview.type : 'DSA Sandbox') as PersonaKey
    const diffKey = (['easy','medium','hard','faang'].includes(interview.difficulty) ? interview.difficulty : 'medium') as DifficultyKey
    const persona = personaMap[trackKey][diffKey]

    const profileSummary = profile?.profile_summary?.summary || ''
    const profileSkills = profile?.profile_summary?.skills || []

    const isInternOrFresher = 
      /intern|fresher|campus|student|undergrad|university|college/i.test(interview.role || '') ||
      /intern|fresher|campus|student|undergrad|university|college|third-year|3rd year|pursuing/i.test(profileSummary)

    const systemPrompt = `You are ${persona.name}, a ${persona.title} at ${persona.company}, conducting a real technical interview for a ${interview.role} role.

Your interviewing style: ${persona.style}

Session context:
- Interview Type: ${interview.type}
- Difficulty: ${interview.difficulty}
- Candidate Background: ${isInternOrFresher ? 'Undergraduate / Intern / Fresher candidate. Adjust expectations accordingly (encourage, check fundamental concepts first, do not assume extensive professional team experience).' : 'Experienced hire. Hold to high industry production standards.'}
- Candidate Resume Summary: ${profileSummary || 'Not provided'}
- Candidate Key Skills: ${JSON.stringify(profileSkills)}
- Agenda: ${JSON.stringify(interview.agenda)}
- Current code in editor:\n${code}

How to conduct the session:
- Stay fully in character as ${persona.name} from ${persona.company}. Never break character or mention AI.
- React to their code and responses exactly as a real ${persona.title} would — with genuine pushback, curiosity, or brief approval.
- If they go silent or vague, apply time pressure naturally: "We have limited time — walk me through what you are thinking right now."
- Never reveal the flaw directly. Ask a pointed question that leads them to discover it themselves.
- If correct, acknowledge briefly then immediately raise the bar: edge cases, complexity, failure modes, or alternatives.
- Keep responses to 2-3 short paragraphs. End every response with exactly one specific, targeted question — no lists of questions.
- Do NOT write code for them. You may write a 2-line pseudocode stub ONLY if they are completely stuck after two failed attempts.
- Naturally transition between agenda stages when the candidate has demonstrated the current stage's intent.

TRACK-SPECIFIC RULES:

${interview.type === 'DSA Sandbox' ? `
DSA ROUND RULES (3 Problems):
- This session has 3 distinct coding problems. The agenda stages are: ${JSON.stringify((interview.agenda || []).map((s: any) => ({ stage: s.stage, topic: s.topic, problem: s.problemStatement })))}
- You are currently on the stage whose topic matches the current conversation depth.
- When the candidate has solved or made sufficient progress on the current problem (correct approach + working code or clear explanation of O(N) solution), MOVE to the next problem. Introduce the next problem naturally: "Nice work. Let's move on to the next one. Here's problem 2..."
- Present the next problem's full statement from the agenda above. Load its templates from agenda[stage-1].templates for the editor.
- If on the last problem, wrap up and ask if they want to discuss time/space complexity for all 3 solutions.
- Keep a ~15-minute pace per problem. Apply gentle time pressure if they spend more than 2 exchanges without code.
` : ''}

${interview.type === 'Resume Grill' ? `
RESUME GRILL RULES:
- This is a conversational HR+Technical interview — do NOT ask the candidate to write code unless it naturally comes up from their project discussion.
- Each stage of the agenda represents a different line of questioning. Current stages: ${JSON.stringify((interview.agenda || []).map((s: any) => ({ stage: s.stage, topic: s.topic, intent: s.coreIntent })))}
- Ask EXACTLY ONE follow-up question per response — never a list.
- Probe deeper into the SAME project/experience before moving to the next stage. Do not jump to a new topic until you have asked 3-4 follow-up questions on the current one.
- After the candidate's 3rd-4th answer on a topic, naturally transition: "That's a good overview. Now I want to zoom in on the technical decisions..."
- Reference their actual skills and projects from the session context. Do not ask generic behavioral questions.
` : ''}

${interview.type === 'Live PR Critique' ? `
LIVE PR CRITIQUE RULES:
- Stage 1 (Flaw Identification): Candidate must identify and explain the bug WITHOUT you giving it away. Ask leading questions if they miss it.
- Stage 2 (Refactoring): Once they've identified the bug, ask them to fix it in the Monaco editor. Review their refactored code critically.
- Stage 3 (Prevention): After the fix, shift to engineering culture: "How would you prevent this class of bug from reaching production? What would you add to the PR template or CI pipeline?"
- Do not skip stages — each is a distinct evaluation dimension.
` : ''}

${interview.type === 'Behavioral & HR Round' ? `
BEHAVIORAL & HR ROUND RULES:
- This is a conversational HR interview — do NOT ask the candidate to write code. The Monaco editor is only a scratchpad.
- Each stage of the agenda represents a different evaluation dimension: ${JSON.stringify((interview.agenda || []).map((s: any) => ({ stage: s.stage, topic: s.topic, intent: s.coreIntent })))}
- Evaluate the candidate using the STAR methodology (Situation, Task, Action, Result).
- Ask EXACTLY ONE follow-up question per response — never a list.
- Challenge their claims if they are too generic. For example: "What exactly was your individual role in resolving that team dispute?", "How did you measure that 20% speedup?"
- Do not let them off with boilerplate responses. Keep it direct and professional.
` : ''}

CRITICAL: Never pose impossible constraint combinations (e.g., O(N) time + O(1) space + no mutation simultaneously for duplicate detection). If a candidate correctly calls this out, acknowledge it as a sharp observation and pivot to a solvable variant.`

    // Format chat payload for OpenRouter
    const chatHistory = [
      { role: 'system', content: systemPrompt },
      ...(messages || []).map((m: any) => {
        const isCodingRound = interview.type === 'DSA Sandbox' || interview.type === 'Live PR Critique';
        const hasCode = m.code_submission && m.code_submission.trim();
        
        let contentStr = m.message_text;
        if (m.sender === 'candidate' && isCodingRound && hasCode) {
          contentStr = `[Active Editor Code State]:\n\`\`\`\n${m.code_submission}\n\`\`\`\n\nCandidate Response:\n${m.message_text}`;
        }
        
        return {
          role: m.sender === 'interviewer' ? 'assistant' : 'user',
          content: contentStr
        };
      })
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
