# Interview OS
> **AI Technical Mock Interview Platform**

Interview OS is an interactive mock interview platform designed to simulate realistic technical screening rounds with Principal and Senior Software Engineers. Instead of generic quiz templates or static question lists, Interview OS leverages candidate resumes, GitHub projects, and target roles to dynamically generate customized, deep-dive coding sessions in a Monaco editor workspace.

## Live Demo

The production environment is live at: [https://interview-os-brown.vercel.app](https://interview-os-brown.vercel.app)

---

## System Architecture

The following diagram illustrates the workflow of onboarding profile syncing, dynamic session initiation, and the real-time streaming loop:

```mermaid
graph TD
    subgraph Onboarding ["1. Onboarding and Sync"]
        A[User Input / Resume Upload] -->|POST /api/profile/sync| B[API Profile Syncer]
        B -->|AI Profile Abstract Synthesis| C[(Supabase DB)]
    end

    subgraph SessionInit ["2. Interview Session Initiation"]
        D[User Clicks New Interview] -->|POST /api/interviews/initiate| E[API Session Initializer]
        C -->|Read User Profile Skills/Repos| E
        E -->|Invoke OpenRouter API| F[AI Question Architect]
        F -->|Return Custom Code Skeleton & Agenda| E
        E -->|Insert Active Interview & Initial Message| C
        E -->|Return Interview ID| G[Monaco Workspace Console]
    end

    subgraph WorkspaceLoop ["3. Real-Time Interview Loop"]
        G -->|POST /api/interviews/id/chat| H[Edge Streaming Route]
        C -->|Read Session Metadata & Agenda| H
        H -->|Stream Chunks in Real-Time| G
        H -.->|Async Non-Blocking Write| I[(Supabase Log DB)]
    end
```

### Edge Stream Workflow (Low-Latency Execution)

Interview OS utilizes a custom Edge runtime stream reader that decouples output processing from database logging. This eliminates client input lockups and guarantees immediate TCP connection closures:

```mermaid
sequenceDiagram
    participant Browser as Monaco Workspace Client
    participant API as Edge POST /api/interviews/[id]/chat
    participant Model as OpenRouter LLM
    participant DB as Supabase Postgres

    Browser->>API: Send response message + editor code content
    API->>Model: Query model (context, prompt, current agenda stage)
    Model-->>API: Stream raw chunk buffers
    loop Stream Processing
        API->>Browser: Enqueue decoded text chunk
    end
    Note over API: Model stream done (EOF)
    API->>Browser: Close ReadableStream immediately (Unlocks Send UI)
    API-->>DB: (Async IIFE Promise) Log combined reply to interview_messages
```

---

## Key Features

*   **Four Specialized Mock Focus Tracks:**
    *   **Live PR Critique:** The AI reads the candidate's tech stack, generates a realistic buggy codebase (such as Go channels race conditions, Python thread locks, or JavaScript event loop errors) and acts as a senior reviewer.
    *   **CS Fundamentals and System Design:** Focuses on low-level class design (OOP), cache replacement logic (LRU), network sockets (TCP/UDP), and OS threads.
    *   **General DSA Sandbox:** Practice classic algorithms formatted in the candidate's chosen language (JavaScript, TypeScript, Python, C++, Java, Go, SQL).
    *   **Resume and Projects Grill:** Tailored specifically to ask questions about projects and tech stacks parsed from the candidate's uploaded resume.
*   **Dynamic Agenda Tracker:** Guides candidates through distinct phases (Conceptual Walkthrough, Coding implementation, and Edge Cases / Review) in real time.
*   **Interactive Monaco Sandbox:** Write and refactor code directly inside a live code editor matching the target track.
*   **Seamless Supabase Integration:** Secure database logging, row-level security (RLS) policies, and profile syncs.

---

## Tech Stack

*   **Framework:** Next.js 16 (App Router, Edge Runtime API Routes)
*   **Database:** Supabase (PostgreSQL client, `@supabase/ssr` server-side cookies, Row Level Security)
*   **Authentication:** Supabase Auth
*   **AI Engine:** OpenRouter API (Gemini/Mistral Model Integration)
*   **Editor:** Monaco Code Editor (`@monaco-editor/react`)
*   **Styling:** Custom Glassmorphism, Dark UI, Framer Motion animations

---

## Getting Started

### 1. Prerequisites
Ensure you have Node.js installed on your machine.

### 2. Database Schema Setup
Execute the DDL schema inside `supabase/schema.sql` in your Supabase SQL Editor. This sets up the target tables (`users`, `user_profiles`, `interviews`, `interview_messages`) and configures Row Level Security (RLS).

### 3. Environment Variables Configuration
Create a `.env.local` file in the root directory and configure the following variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
OPENROUTER_API_KEY=your-openrouter-api-key
```

### 4. Running Locally
Install the dependencies and start the local development server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## License
This project is licensed under the MIT License.
