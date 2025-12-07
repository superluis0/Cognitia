# Cognitia

A Chrome extension that overlays on X.com, detecting Grokipedia topics in tweets and providing AI-powered summaries and chat via xAI's Grok API.

## Features

- **Topic Detection**: Automatically detects Grokipedia topics in tweets using Aho-Corasick pattern matching
- **Visual Highlights**: Topics are underlined with a blue dotted line
- **AI Summaries**: Hover over a topic to see a Grok-generated summary
- **Sidebar Chat**: Click on a topic to open a sidebar with:
  - Full summary
  - Link to Grokipedia page
  - Curated quick questions
  - Free-text chat with Grok about the topic

## Architecture

```
extension/          # Chrome Extension (Manifest V3)
  ├── src/
  │   ├── content/  # Tweet ID extraction, highlighting, tooltips
  │   ├── background/ # Service worker for API communication
  │   ├── popup/    # Settings UI
  │   └── sidebar/  # Chat sidebar (vanilla JS)
  └── styles/       # CSS styles

backend/            # Node.js Backend
  ├── src/
  │   ├── api/      # REST endpoints
  │   ├── grok/     # xAI Grok API client (direct HTTP)
  │   ├── xapi/     # X API v2 client
  │   ├── index/    # SQLite FTS5 topic database
  │   ├── matching/ # Aho-Corasick topic matcher
  │   └── crawler/  # Grokipedia crawler integration
  └── data/         # SQLite database

shared/             # Shared TypeScript types
```

## Setup

### Prerequisites

- Node.js 20+
- X API Bearer Token
- xAI API Key

### Backend

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys:
# XAI_API_KEY=your_xai_api_key
# X_API_BEARER_TOKEN=your_x_api_token

# Run development server
npm run dev

# Or build and run
npm run build
npm start
```

The backend runs on `http://localhost:3001` by default.

### Extension

```bash
cd extension
npm install
npm run build
```

Then load the extension in Chrome:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder

### Configuration

Click the Cognitia extension icon to configure:
- **Backend URL**: Default is `http://localhost:3001`
- **X API Token**: Optional if you want to use your own token

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/match` | POST | Match tweet IDs to topics |
| `/api/summary` | POST | Generate topic summary |
| `/api/chat` | POST | Chat about a topic |
| `/api/questions` | POST | Generate quick questions |
| `/health` | GET | Health check |

## Grokipedia Data

The backend includes a sample seed of topics. To populate with full Grokipedia data:
1. Use your Grokipedia crawler to extract topics
2. Insert into the SQLite database using `insertTopic()` from `src/index/database.ts`

## xAI API

Uses `grok-4-1-fast-non-reasoning-latest` model via direct HTTP calls to `https://api.x.ai/v1/chat/completions`.

No SDK required - just a bearer token in the Authorization header.
