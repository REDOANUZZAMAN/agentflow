<div align="center">

# 🤖 AgentFlow

### **Chat-First AI Agent Builder for Everyone**

*Type one sentence → Watch an entire AI workflow build itself on screen*

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![React Flow](https://img.shields.io/badge/React_Flow-FF0072?style=for-the-badge&logo=react&logoColor=white)](https://reactflow.dev/)
[![Claude AI](https://img.shields.io/badge/Claude_AI-CC785C?style=for-the-badge&logo=anthropic&logoColor=white)](https://anthropic.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

---

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   💬 "Make me an agent that writes a daily news summary          ║
║       and emails it to me"                                       ║
║                                                                  ║
║   🤖 Building...                                                 ║
║       ⏰ Schedule Trigger  →  🔍 Web Search  →  🧠 Claude AI    ║
║       →  📧 Send Email                                          ║
║                                                                  ║
║   ✨ Your workflow is ready! Want to run a test?                 ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

</div>

---

## ✨ The Magic Moment

> A user who has **never seen n8n or written code** types one sentence and watches a working AI agent **assemble itself on screen**, then runs it and sees **exactly what it did**.

AgentFlow is a **chat-first AI agent builder** where you describe what you want in plain English, and an AI assistant builds, runs, and shows the entire agent workflow live on a visual canvas next to the chat. The backend is fully visible — every node, API call, and log streams in real time so you **learn what's happening as it happens**.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AgentFlow App                            │
├──────────────┬──────────────────────┬──────────────────────────┤
│              │                      │                          │
│  💬 CHAT     │   🎨 CANVAS          │   🔍 INSPECTOR           │
│  PANEL       │   (React Flow)       │   (Collapsible)          │
│              │                      │                          │
│ User talks   │ Nodes appear,        │ Tabs:                    │
│ to Builder   │ connect & animate    │ • Timeline               │
│ Agent in     │ as the AI builds     │ • Network                │
│ natural      │ them live            │ • Logs                   │
│ language     │                      │ • Variables              │
│              │ User can also drag   │ • Cost                   │
│ Supports:    │ nodes manually       │                          │
│ • Markdown   │                      │ Streams live events      │
│ • Code       │ Click any node to    │ when workflow runs       │
│ • Buttons    │ see/edit config      │                          │
│              │                      │ Every API call visible   │
├──────────────┴──────────────────────┴──────────────────────────┤
│                     🔧 Builder Agent (Claude AI)                │
│  Tools: add_node · connect_nodes · update_node · delete_node   │
│         run_workflow · explain_error                            │
├─────────────────────────────────────────────────────────────────┤
│              ⚡ Execution Engine (Real API Calls)               │
│  fal.ai · Cloudinary · ElevenLabs · Claude · Kling Video       │
├─────────────────────────────────────────────────────────────────┤
│       🗄️ Supabase (Auth + Database + Edge Functions)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Three-Panel Layout

| Panel | Description |
|-------|-------------|
| **💬 Left — Chat** | Talk to the Builder Agent in plain English. Ask it to build workflows, modify nodes, or explain errors. Messages support markdown, code blocks, and inline action buttons. |
| **🎨 Center — Canvas** | Visual workflow canvas powered by React Flow. Nodes appear, connect, and animate into place as the AI creates them — like watching someone build LEGO. Drag nodes to rearrange. |
| **🔍 Right — Inspector** | Collapsible backend inspector with tabs: Timeline, Network, Logs, Variables, Cost. Streams live events during execution with JSON syntax highlighting. |

All three panels are **resizable** with drag handles.

---

## 🧩 Node Library

The Builder Agent picks from these node types to assemble workflows:

### ⚡ Triggers
| Node | Description |
|------|-------------|
| 👆 Manual Trigger | Click to start |
| ⏰ Schedule Trigger | Cron-based scheduling |
| 🔗 Webhook Trigger | HTTP endpoint |

### 🧠 AI & Generation
| Node | Description |
|------|-------------|
| 🧠 Claude Chat | Claude AI for text generation |
| 🖼️ Image Gen | AI image generation via fal.ai |
| 🎬 Video Gen | AI video generation (Kling) |
| 🗣️ Voice Gen | Text-to-speech (ElevenLabs) |

### 🎬 Video Pipeline
| Node | Description |
|------|-------------|
| 📜 Script Parser | Parse scripts into scenes & shots |
| 🎭 Element Reference | Consistent character/location images |
| 📸 Photo Generator | Scene stills via fal.ai |
| 🎬 Video Generator | Photo-to-video via Kling |
| 🗣️ Voiceover Generator | Dialogue audio via ElevenLabs |
| 🎯 Project Orchestrator | Coordinates all generation |
| 🎞️ Final Video Compiler | Merges clips via Cloudinary |

### 📱 Social & Communications
| Node | Description |
|------|-------------|
| 🐦 Post to X | Twitter/X posting |
| 📸 Post to Instagram | Instagram posting |
| 💼 Post to LinkedIn | LinkedIn posting |
| 🎵 Post to TikTok | TikTok posting |
| 📧 Send Email | Email via Resend |
| ✈️ Send Telegram | Telegram messaging |

### 🌐 Web & Data
| Node | Description |
|------|-------------|
| 🔗 HTTP Request | Custom API calls |
| 🔍 Web Search | Search the web |
| 🕷️ Web Scraper | Extract page content |

### 📁 Files & Logic
| Node | Description |
|------|-------------|
| 📄 File Read/Write | File operations |
| 🔀 If/Else | Conditional branching |
| 🔄 Loop | Iterate over items |
| ⏳ Wait | Delay execution |

---

## 🤖 How the Builder Agent Works

The Builder Agent is powered by **Claude claude-sonnet-4-6** with tool use. It has tools it can call to modify the canvas in real time:

```typescript
// The agent has these tools:
add_node(type, config, position)    // Add a node to the canvas
connect_nodes(fromId, toId)         // Wire two nodes together
update_node(id, config)             // Change node settings
delete_node(id)                     // Remove a node
run_workflow()                      // Execute the workflow
explain_error(executionId)          // Explain what went wrong
```

### 🔄 How it flows:

1. **You type:** *"Make me an agent that writes a daily joke and emails it"*
2. **Agent narrates:** *"I'm adding a Schedule trigger that runs every morning at 8am..."*
3. **Canvas updates:** ⏰ node appears and animates into place
4. **Agent continues:** *"...now connecting it to a Claude node that writes the joke..."*
5. **Canvas updates:** 🧠 node appears, edge connects them
6. **Agent finishes:** *"...and a Send Email node to deliver it. Your 😂 Daily Joke Machine is ready!"*
7. **You click:** ▶️ Run Workflow
8. **Inspector streams:** Live API calls, costs, logs in real time

---

## 🛡️ Server-Side Validation

AgentFlow enforces correctness at every layer — the agent can be sloppy, but the system catches it:

```
╔═══════════════════════════════════════════════════════╗
║  Layer 1: API Handler (add_node)                      ║
║  → applyDefaults() fills missing required fields      ║
║  → Rejects placeholder values (proj_phishing_001)     ║
╠═══════════════════════════════════════════════════════╣
║  Layer 2: Client Store (AUTO_FIX_DEFAULTS)            ║
║  → One-click "Auto-fix" applies defaults to all nodes ║
╠═══════════════════════════════════════════════════════╣
║  Layer 3: Execution Engine (pre-run)                  ║
║  → applyDefaults() again before executing             ║
║  → Catches anything that slipped through              ║
╚═══════════════════════════════════════════════════════╝
```

Every node type has a **schema** defining required fields and sensible defaults:
- **Voiceover:** voice defaults to `'Rachel'`, model to ElevenLabs v3
- **Photo Generator:** model defaults to `fal-ai/nano-banana-2`, 1920×1080
- **Video Generator:** model defaults to Kling O3 Pro, 5 seconds
- **Final Compiler:** transition=`cut`, format=`mp4`, resolution=`1080p`

---

## 🚀 Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | Full-stack React framework |
| **TypeScript** | Type safety everywhere |
| **Tailwind CSS** | Utility-first styling |
| **React Flow** | Interactive node canvas |
| **Claude AI** (claude-sonnet-4-6) | Builder Agent brain + tool use |
| **Supabase** | Auth, PostgreSQL database, Edge Functions |
| **fal.ai** | Image generation (Nano Banana, Seedream) |
| **Kling Video** | AI video generation (O3 Pro) |
| **ElevenLabs** | Text-to-speech and music |
| **Cloudinary** | Media storage, video compilation |
| **OpenRouter** | Multi-model AI fallback (DeepSeek, Gemini) |

---

## 📁 Project Structure

```
agentflow/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Landing page
│   │   ├── dashboard/                # User dashboard
│   │   ├── builder/[workflowId]/     # Main builder interface
│   │   ├── library/                  # Asset library
│   │   ├── signin/ signup/           # Auth pages
│   │   └── api/
│   │       ├── chat/route.ts         # 🤖 Builder Agent (Claude + tools)
│   │       ├── execute/route.ts      # ⚡ Workflow executor
│   │       ├── generate/route.ts     # 🎨 Asset generation
│   │       ├── compile/route.ts      # 🎞️ Video compilation
│   │       ├── assets/route.ts       # 📦 Asset management
│   │       └── projects/route.ts     # 📂 Project CRUD
│   ├── components/
│   │   ├── ChatPanel.tsx             # 💬 Left panel - chat interface
│   │   ├── WorkflowCanvas.tsx        # 🎨 Center - React Flow canvas
│   │   ├── WorkflowNode.tsx          # 🧩 Custom node component
│   │   ├── NodeConfigPanel.tsx       # ⚙️ Node settings panel
│   │   ├── NodeSidebar.tsx           # 📚 Draggable node palette
│   │   ├── InspectorPanel.tsx        # 🔍 Right panel - live inspector
│   │   ├── TerminalPanel.tsx         # 💻 Execution terminal
│   │   ├── TaskListCard.tsx          # ✅ AI task progress tracker
│   │   ├── ProjectGallery.tsx        # 🖼️ Asset gallery view
│   │   └── CanvasContextMenu.tsx     # 📋 Right-click menu
│   └── lib/
│       ├── store.ts                  # 🗄️ Global state (useReducer)
│       ├── context.tsx               # 🔗 React context provider
│       ├── types.ts                  # 📝 TypeScript types + tool defs
│       ├── execution-engine.ts       # ⚡ Real API executor
│       ├── node-defaults.ts          # 🛡️ Schema validation + defaults
│       ├── fal-pricing.ts            # 💰 Real cost calculation
│       ├── fal-models.ts             # 🎨 fal.ai model catalog
│       ├── supabase.ts               # 🔌 Supabase client
│       └── chat-client.ts            # 💬 Chat API client
├── supabase/
│   ├── functions/
│   │   └── claude-proxy/index.ts     # 🌐 Edge function (Claude proxy)
│   └── supabase-schema.sql           # 🗄️ Database schema
└── public/                           # Static assets
```

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Supabase** account (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/REDOANUZZAMAN/agentflow.git
cd agentflow
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Or create `.env.local` manually with these variables:

```env
# ─── Supabase (Required) ─────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── AI / LLM (At least one required) ───────────────────────────
# Option A: Anthropic direct (if not blocked in your region)
ANTHROPIC_API_KEY=sk-ant-...

# Option B: OpenRouter proxy (recommended for restricted regions)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324

# ─── fal.ai — Image / Video / Voice Generation ──────────────────
# Required for running workflows that generate media
FAL_API_KEY=your_fal_api_key_here

# ─── Cloudinary — Asset Storage ──────────────────────────────────
# Required for storing generated images, videos, and audio
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# ─── Railway Deployment (Optional) ──────────────────────────────
# Service-account auth when anonymous signups are disabled
RAILWAY_SERVICE_EMAIL=service@example.com
RAILWAY_SERVICE_PASSWORD=your_service_password
```

> **Note:** All secrets are loaded from environment variables only — no credentials are hardcoded in the codebase. See `.env.example` for the complete reference.

### 4. Set up the database

Run the SQL in `supabase-schema.sql` in your Supabase SQL editor.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start building! 🚀

---

## 🎮 Example Workflows

### 😂 Daily Joke by Email
```
User: "Send me a daily joke by email every morning at 8am"

Built: ⏰ Schedule → 🧠 Claude AI → 📧 Send Email
```

### 📰 News Summary Bot
```
User: "Make me an agent that writes a daily news summary and emails it"

Built: ⏰ Schedule → 🔍 Web Search → 🧠 Claude AI → 📧 Send Email
```

### 🎬 Script-to-Video Pipeline
```
User: "I have a script with 3 shots. Build me a video pipeline."

Built: 📜 Script Parser → 🎭 Element Refs → 📸 Photos → 🎬 Videos 
       → 🗣️ Voiceovers → 🎯 Orchestrator → 🎞️ Final Compiler
```

### 🔍 Web Monitor with Alerts
```
User: "Monitor a website for changes and alert me on Telegram"

Built: ⏰ Schedule → 🕷️ Web Scraper → 🔀 If Changed → ✈️ Telegram
```

---

## 🎨 Noob-Friendly Features

| Feature | Description |
|---------|-------------|
| 🖐️ **Onboarding** | "Hi! Tell me what you want your agent to do." with clickable example chips |
| 🗣️ **Plain English** | The agent always explains in simple language, no jargon |
| 🔴 **Error Translation** | Instead of "401 Unauthorized" → "Your Twitter login expired, click here to reconnect" |
| ❓ **Show Me How** | Every node has a friendly explainer button |
| 💾 **Auto-Save** | Workflows saved with auto-generated names and emoji icons |
| 🛡️ **Auto-Fix** | Missing fields are auto-filled with sensible defaults |
| 📊 **Live Cost** | Real-time cost tracking for every API call |

---

## 📊 Data Model

```sql
User                    -- Authenticated user
  └── Workflow          -- nodes + edges JSON, name, emoji
       ├── Execution    -- single run of a workflow
       │    └── ExecutionStep  -- per-node result
       ├── ChatMessage  -- conversation history
       ├── Credential   -- API keys (encrypted)
       └── Asset        -- generated media files
```

---

## 🗺️ Roadmap

- [x] Three-panel resizable layout
- [x] Chat panel wired to Claude API with tool use
- [x] React Flow canvas with custom nodes
- [x] Claude canvas-editing tools (add/connect/update/delete)
- [x] Real execution engine (fal.ai, Cloudinary, ElevenLabs)
- [x] Live Inspector with timeline, logs, costs
- [x] Server-side validation + auto-defaults
- [x] Script-to-video pipeline (7 node types)
- [x] Multi-model AI fallback (Claude → DeepSeek → Gemini)
- [ ] Social media posting (Ayrshare integration)
- [ ] Webhook triggers with real endpoints
- [ ] Scheduled execution (BullMQ + Redis)
- [ ] Workflow templates marketplace
- [ ] Collaborative editing
- [ ] Mobile responsive design

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

### Built with ❤️ by [REDOANUZZAMAN](https://github.com/REDOANUZZAMAN)

**⭐ Star this repo if you find it useful!**

*AgentFlow — Where one sentence creates an entire AI agent* ✨

</div>
