# Cognitia

A Chrome extension that enriches your X.com (Twitter) browsing experience by automatically detecting and highlighting topics with AI-powered summaries from Grokipedia and chat powered by xAI's Grok.

## Features

- **Automatic Topic Detection**: Highlights topics in tweets using an efficient Aho-Corasick matching algorithm
- **AI-Powered Summaries**: Generates contextual summaries using xAI's Grok API
- **Interactive Sidebar**: Click on highlighted topics to see full summaries, quick questions, and chat
- **Chat with Grok**: General-purpose AI chat accessible from the extension
- **7 Highlight Styles**: Dotted, solid, dashed, wavy, tint, combo, and colored
- **In-Sidebar Settings**: Change highlight styles and toggle the extension without leaving X.com
- **1,200+ Topics**: Pre-seeded with Wikipedia's Vital Articles and trending topics
- **Auto-Crawling**: Automatically discovers and crawls new topics from Grokipedia every hour
- **Auto-Refresh**: Extension refreshes every 5 minutes to pick up newly crawled topics
- **Premium UI**: "Neural Elegance" design with Amber Ember color palette and glassmorphism effects
- **Markdown Rendering**: Full markdown support in chat including headers, lists, code blocks, and tables

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Chrome         │     │  Node.js        │     │  External APIs  │
│  Extension      │────▶│  Backend        │────▶│  - X API v2     │
│  (Content +     │◀────│  (Express +     │◀────│  - xAI Grok     │
│   Background)   │     │   SQLite)       │     │  - Grokipedia   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  DOM Overlay    │     │  SQLite + FTS5  │
│  (Highlights,   │     │  (Topics DB,    │
│   Tooltips,     │     │   Aho-Corasick  │
│   Sidebar)      │     │   Matcher)      │
└─────────────────┘     └─────────────────┘
```

### Data Flow

1. **Tweet Detection**: Extension detects visible tweets on X.com
2. **X API Fetch**: Backend fetches tweet text via X API v2
3. **Topic Matching**: Aho-Corasick algorithm matches topics from SQLite database
4. **DOM Highlighting**: Extension highlights matched topics in the DOM
5. **AI Summaries**: On hover/click, backend calls xAI Grok for summaries
6. **Chat**: User can chat with Grok about specific topics or generally

## Setup

### Prerequisites

- Node.js 18+
- Python 3.9+
- Chrome browser
- xAI API key (for AI summaries and chat)
- X API Bearer Token (for fetching tweet text)

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your API keys:
#   XAI_API_KEY - Get from https://console.x.ai/
#   X_API_BEARER_TOKEN - Get from https://developer.x.com/

# Build and start
npm run build
npm start
```

The backend runs on `http://localhost:3001` by default. The crawler scheduler starts automatically and crawls new topics every hour.

### Seed Topics (Optional)

To seed the database with 1,200+ topics from Wikipedia:

```bash
curl -X POST http://localhost:3001/api/scheduler/seed-parallel
```

Check progress:
```bash
curl http://localhost:3001/api/scheduler/parallel-status
```

### Extension Setup

```bash
cd extension
npm install
npm run build
```

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder

### Configure Extension

1. Click the Cognitia extension icon in the toolbar
2. Ensure "Enable Cognitia" is checked
3. Choose your preferred highlight style

## Usage

1. Navigate to [x.com](https://x.com)
2. Scroll through your feed
3. Topics will be highlighted with your chosen style (amber colored by default)
4. **Hover** over a topic to see a quick summary tooltip
5. **Click** on a topic to open the sidebar with:
   - Full summary from Grokipedia
   - Link to Grokipedia article
   - Quick questions
   - Chat interface for follow-up questions
6. **Home button** in sidebar opens settings
7. **Chat with Grok** button opens general chat mode

## API Endpoints

### Topic Matching
- `POST /api/match` - Match topics in tweet text (uses X API to fetch tweets)

### Summaries & Chat
- `POST /api/summary` - Get AI-generated summary for a topic
- `POST /api/chat` - Chat with Grok about a specific topic
- `POST /api/chat/general` - General chat with Grok (uses reasoning model)
- `POST /api/questions` - Get suggested questions for a topic

### Crawler & Scheduler
- `GET /api/scheduler/status` - Get scheduler status
- `POST /api/scheduler/seed-parallel` - Start parallel seeding from Wikipedia
- `GET /api/scheduler/parallel-status` - Get seeding progress
- `POST /api/scheduler/start` - Start hourly crawler (auto-starts on boot)
- `POST /api/scheduler/stop` - Stop crawler
- `POST /api/scheduler/trigger` - Manually trigger a crawl batch

## Tech Stack

### Extension
- TypeScript
- Chrome Manifest V3
- Custom markdown renderer
- Glassmorphism UI with CSS animations

### Backend
- Node.js + Express
- TypeScript
- SQLite with FTS5 full-text search
- Aho-Corasick multi-pattern matching

### AI & APIs
- **xAI Grok API**: `grok-4-1-fast-non-reasoning-latest` for summaries/topic chat, `grok-4-1-fast-reasoning-latest` for general chat
- **X API v2**: For fetching tweet text by ID
- **Grokipedia**: Python crawler for topic content extraction

### Crawler
- Python 3 crawler for Grokipedia content extraction
- Node.js wrapper with parallel processing (20 workers)
- Automatic link discovery for continuous database growth
- Hourly scheduled crawls

## Design System

- **Color Palette**: "Amber Ember" (#f59e0b, #d97706, #b45309)
- **Typography**: Clash Display (headers), Space Grotesk (body), JetBrains Mono (code)
- **Effects**: Glassmorphism, staggered reveal animations, gradient borders

## License

MIT
