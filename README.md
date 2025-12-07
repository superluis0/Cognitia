# Cognitia

A Chrome extension that enriches your X.com (Twitter) browsing experience by automatically detecting and highlighting topics with AI-powered summaries from Grokipedia.

## Features

- **Automatic Topic Detection**: Highlights topics in tweets using an efficient Aho-Corasick matching algorithm
- **AI-Powered Summaries**: Generates contextual summaries using xAI's Grok API
- **Interactive Sidebar**: Click on highlighted topics to see full summaries, quick questions, and chat
- **1,200+ Topics**: Pre-seeded with Wikipedia's Vital Articles and trending topics
- **Continuous Discovery**: Automatically discovers and crawls new topics from Grokipedia

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Chrome         │     │  Node.js        │     │  External APIs  │
│  Extension      │────▶│  Backend        │────▶│  - xAI Grok     │
│  (Content +     │     │  (Express +     │     │  - Grokipedia   │
│   Background)   │     │   SQLite)       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

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

The backend runs on `http://localhost:3001` by default.

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

1. Click the Cognitia extension icon
2. Ensure "Enable Cognitia" is checked
3. Backend URL should be `http://localhost:3001`

## Usage

1. Navigate to [x.com](https://x.com)
2. Scroll through your feed
3. Topics will be highlighted with blue dotted underlines
4. **Hover** over a topic to see a quick summary tooltip
5. **Click** on a topic to open the sidebar with:
   - Full summary
   - Quick questions
   - Chat interface for follow-up questions

## API Endpoints

### Topic Matching
- `POST /api/match` - Match topics in tweet text

### Summaries & Chat
- `POST /api/summary` - Get AI-generated summary for a topic
- `POST /api/chat` - Chat with Grok about a topic
- `POST /api/questions` - Get suggested questions for a topic

### Crawler & Scheduler
- `GET /api/scheduler/status` - Get scheduler status
- `POST /api/scheduler/seed-parallel` - Start parallel seeding
- `GET /api/scheduler/parallel-status` - Get seeding progress
- `POST /api/scheduler/start` - Start hourly crawler
- `POST /api/scheduler/stop` - Stop crawler

## Tech Stack

- **Extension**: TypeScript, Chrome Manifest V3
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite with FTS5 full-text search
- **AI**: xAI Grok API (grok-4-1-fast-non-reasoning-latest)
- **Matching**: Aho-Corasick algorithm for multi-pattern matching
- **Crawler**: Python + Node.js wrapper for Grokipedia extraction

## License

MIT
