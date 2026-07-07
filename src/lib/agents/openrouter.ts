export async function getOpenRouterStream(messages: any[]) {
  const apiKey = process.env.OPENROUTER_API_KEY
  
  // Return a mock stream if the OpenRouter key is not yet set
  if (!apiKey || apiKey.includes('sk-or-v1-...')) {
    const encoder = new TextEncoder()
    return new ReadableStream({
      async start(controller) {
        const mockText = "I see your code submission. (Note: Please set a valid OPENROUTER_API_KEY in your .env.local file to connect to real LLM engines). Let's review the concurrency loop: how can we serialize access to avoid this asynchronous race condition?"
        for (let i = 0; i < mockText.length; i += 5) {
          controller.enqueue(encoder.encode(mockText.slice(i, i + 5)))
          await new Promise(resolve => setTimeout(resolve, 30))
        }
        controller.close()
      }
    })
  }

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
      messages,
      stream: true,
    }),

  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API call failure: ${errorText}`)
  }

  return response.body
}
