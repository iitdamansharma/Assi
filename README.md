# On-Ground.ai Call Centre — Engineering Assignment Submission

A full-featured Call Centre web application and real-time voice copilot built from scratch for the **On-Ground.ai Engineering Hiring Assignment**.

It includes every core screen and interaction flow from the design reference (**Dashboard**, **Plan: Calls to make / Incoming / Recent / Practise a call**, **Active Call + Live Transcript + AI Assist**, **Calendar**, **Pulse Home & Channel Chat**, and **Leads Modal with Paging**), all 5 bonus deliverables, and a **real working calling engine** supporting both **AI-to-Human live voice calls** and **Human-to-Human WebRTC peer-to-peer calls**.

---

## 1. How to Run the App

### Option A — Full Server Mode (Recommended: HTTP + AI Endpoint + Multi-Device WebRTC Signaling)
Requires **Node.js (v18+)** — **zero `npm install` packages needed** (uses Node's built-in `http`, `fs`, and RFC 6455 WebSocket upgrade):

```bash
node server.js
# or
npm start
```

Then open in Chrome / Edge:
- **Call Centre Agent Console:** `http://localhost:3000`
- **Customer Companion Phone (Human-to-Human WebRTC):** `http://localhost:3000/companion.html` (or click **👥 Open Customer Handset** inside the app's left sidebar).

### Option B — Zero-Setup Direct Browser Launch
You can also open `index.html` directly in Chrome or Edge.
- `js/data.js` loads `./data/mockData.json` over HTTP and falls back to an embedded dataset over `file://`, persisting state changes in `localStorage`.
- Cross-tab **Human-to-Human WebRTC calling** (`companion.html`) also works serverless on the same machine via the browser's `BroadcastChannel('onground_webrtc_signaling')` API.

---

## 2. Stack Chosen & Why

| Layer | Technology | Why We Picked It |
| :--- | :--- | :--- |
| **Frontend UI & State** | Modular Vanilla HTML5, CSS3 (`css/styles.css`), ES6 JavaScript (`js/data.js`, `js/calling.js`, `js/app.js`) | Zero build-step friction, instant startup, clean separation of concerns (Data Store vs. Voice/WebRTC Engine vs. View Controller), and rock-solid reliability during live demos. |
| **Data Layer** | `./data/mockData.json` + `localStorage` persistence (`OGStore`) | Meets the assignment ground rule to load sample dashboard/lead/channel data from local JSON while persisting user actions (new messages, resolved "Needs your input" pins, call wrap-ups, and updated KPIs). |
| **Charts** | **Chart.js 4** | Powers the 7-day **Calls handled** bar chart, 7-day **CSAT trend** chart, and the 6-dimension **OG Score™ Radar Chart**. |
| **Real Calling Engine** | **Web Speech API (`SpeechRecognition` + `speechSynthesis`)**, **Web Audio API (`AudioContext` + `AnalyserNode`)**, **WebRTC (`RTCPeerConnection`)**, and **Node.js RFC 6455 WebSocket Server (`server.js`)** | Enables genuine microphone capture, real-time speech-to-text transcription, live 16-bar audio spectrum visualization, contextual AI customer voice responses, and real bidirectional WebRTC audio between two human participants without requiring paid third-party telephony keys to test. |

---

## 3. How the Real Calling Feature Works

The calling engine (`js/calling.js` + `server.js` + `companion.html`) supports **three real calling modes**, selectable from the **Live Calling Engine** card in the bottom-left sidebar or inside the **Pre-Call SOP Checklist** modal:

### Mode 1: AI-to-Human Live Voice Calling (`ai` — Default)
1. **Authentic Telephony Audio (`Web Audio API`)**: When you click `📞 Place call`, `Call back`, or `🎙️ Practise a call`, `OGCalling` synthesizes dual-tone multi-frequency (DTMF) dial bursts and standard Indian PSTN ringback cadence (`400 Hz + 450 Hz`) before connecting.
2. **Real Microphone Capture & Spectrum Visualizer (`getUserMedia` + `AnalyserNode`)**: Connects to your microphone and drives a live 16-bar frequency visualizer in the Active Call header.
3. **Live Speech-to-Text (`SpeechRecognition` / `webkitSpeechRecognition`)**: Continuously transcribes what you speak into your microphone (`en-IN`) into the **Live Transcript** column.
   - *No-Mic / Quiet-Room Fallback*: Also includes 6 one-click **SOP Quick-Say chips** and a text input bar so you can trigger any spoken turn even without a microphone.
4. **Contextual AI Customer Voice Engine (`/api/ai-reply` + `speechSynthesis`)**: Each lead (`Mukunda`, `Ritu S.`, `Faizan A.`, `Kavitha R.`, `Divya P.`) has a domain-specific persona (appliance model, store walk-in story, exchange concern, EMI preference, warranty question). When you finish speaking a sentence, the AI Customer replies contextually and speaks aloud through your speakers using `window.speechSynthesis` (`en-IN` voice).
5. **Real-Time 6-Point SOP Detector & Off-SOP Drift Nudge**:
   - Every agent utterance is evaluated live against the 6 SOP checkpoints:
     1. *Opening & Intent Confirm*
     2. *Needs Discovery*
     3. *Product Pitch*
     4. *EMI / Financing Mention*
     5. *Warranty Mention*
     6. *Closing / Callback Booking*
   - Covered items automatically turn green (`✅ Covered`) with the exact spoken quote, unlock the **SOP Pro (+25 XP)** badge at 5/6, update customer sentiment, and auto-draft the live call summary.
   - If you speak without covering the next expected SOP checkpoint, a **`⚠️ Drifting off SOP`** warning banner appears with a 1-click recovery script.

### Mode 2: Human-to-Human Live Calling (`webrtc` — WebRTC Peer-to-Peer + Companion Handset)
1. Click **👥 Open Customer Handset** in the left sidebar (or open `http://localhost:3000/companion.html` in a second browser window or another device on the LAN).
2. When you place a call in **Human-to-Human (WebRTC)** mode, the Companion Handset rings with an incoming call screen (`Incoming Call from Avani Sharma · On-Ground.ai`).
3. Clicking **✓ Answer Call** on the handset establishes a real **WebRTC `RTCPeerConnection`** (signaled over WebSocket `/ws` and `BroadcastChannel`) streaming live microphone audio between the two humans, while streaming both sides' transcript into the Agent's AI Assist console.
4. You can also click **📞 Dial Inbound to Call Centre Agent** on the Companion Handset to ring the agent console with a live inbound human call!

### Mode 3: System / Cellular Phone Bridge (`tel:`)
- Invokes the OS/mobile telephony handler (`tel:+91...`) via Windows Phone Link, macOS Continuity, or mobile dialer while keeping the live microphone **AI Assist & SOP Copilot** active on screen.

---

## 4. What Was Completed vs. Skipped

### Completed (100% of Core + Bonus Features)
- **App Shell**: Dark-green sidebar (`Dashboard`, `Plan` -> `Calls to make`, `Incoming`, `Recent`, `Practise a call`, `Calendar`, `Pulse`) and top bar (Notification bell with unread count & modal, `OG 76` radar modal, `⭐ #3` leaderboard modal, `Consultant` selling avatar selector, and Agent profile/settings modal).
- **Dashboard**: Indigo command-center hero with 4 KPI cards (`OG Score™ 76`, `Avg Handle Time 4m 12s`, `CSAT Today 94%`, `In Queue 2`), interactive Date Range filter (`Today`, `Yesterday`, `Last 7 Days`, `This Month`), `My Progress · today` (`3 Leads Created`, `2 Leads Called`), `Who's waiting` live callback queue (`Priya Iyer`, `Suresh Nair`), `My earnings this month` (`₹5,200` progress bar + breakdown modal), `My Tasks` brown gradient card synced with Pulse pins, and 2 full-width 7-day charts.
- **Plan**:
  - `Calls to make`: Ranked by lead attractiveness score (`96`, `90`, `88`, `55`, `38`), expandable inline details (`Story so far`, `Preferred product`, `Cross-sell`, `EMI / financing`), pagination (`2 per page` + `Show All`), and `Pre-Call SOP Checklist` modal.
  - `Incoming`: Missed calls summary (`Missed today: 5`, `Expected value at stake: ₹91,860`) and ranked callback list that dynamically clears when called back.
  - `Recent`: Call history with direction icons, duration, SOP scores, outcome tags, and click-to-open **6-Point Call SOP Review Modal** with transcript evidence.
- **Calendar**: Month grid with event dots, `Today` button, month switcher, `Upcoming` invites list, `+ New Event` modal, and 1-click `Share invite`.
- **Pulse Home & Channel Chat**:
  - `AvaniBot` hero card (`Daily Brief` & `Ask a question`), collapsible `Custom Agents`, `Role Agent Leadership` (`#asm-leader`, `#callcentre-leader`), `Role Agents` (`#callcentre-agent`, `#asm-agent`), `Task Agents` (`#lead-followup`, `#emi-push`, `#walkout-recovery`, `#pitch-coach`), `#customer-discussions` WhatsApp Business proxy, `Kudos` hero card + modal, internal channels, and DMs.
  - Channel chat view with **pinned "Needs your input" card** (two action buttons + custom text reply) that syncs completion state back to Dashboard `My Tasks`, structured `STAKEHOLDERS / ISSUE DEFINITION / SUGGESTED RESOLUTION` cards, and working message composer with emoji bar.
- **Leads Modal with Paging**: Paging through all 5 leads (`Lead 1 of 5` to `Lead 5 of 5`) with prev/next arrows and dot indicators, `Quote to be given to customer` toggle, `ICP Fit Score` bar + collapsible breakdown, `Lead Intent Score`, `How we got here` journey, `Where we picked up signals`, `Before you reach out`, action buttons (`No Interest`, `WhatsApp`, `On-ground Call`, `Came Back ✓`), and `Cumulative Missed` footer.
- **All Bonus Items**:
  - Send messages in any Pulse channel or WhatsApp proxy thread
  - Answer the "Needs your input" card (updates both Pulse and Dashboard `My Tasks`)
  - `Practise a call` incoming ring simulation + full Active Call & Post-Call Wrap-up screen
  - Responsive phone-width layout (`@media (max-width: 860px)`) with slide-out drawer and mobile bottom navigation bar
  - Charts built with **Chart.js**

### Skipped
- External PSTN carrier billing (Twilio paid SIP trunk); instead, we built native browser-to-browser **WebRTC Human-to-Human voice calling**, **Web Speech AI-to-Human voice calling**, and **`tel:` cellular dialer bridging** so everything works live out of the box without requiring paid API credentials.

---

## 5. AI Tools Used
- **Antigravity (Google DeepMind Agentic Coding Assistant)**: Used for architecture planning, structuring the local JSON dataset (`data/mockData.json`), building the WebRTC/Web Speech calling engine (`js/calling.js`), and verifying responsive UI states.
