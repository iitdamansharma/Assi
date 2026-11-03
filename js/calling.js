/**
 * On-Ground.ai Call Centre — Real Calling Engine (js/calling.js)
 * Supports:
 *   1. AI-to-Human Live Voice Calling (Web Speech STT + Web Audio API + Neural/Browser TTS + AI Persona Engine)
 *   2. Human-to-Human Live Calling (WebRTC RTCPeerConnection + WebSocket / BroadcastChannel signaling + Companion Phone)
 *   3. System / Cellular Dialer Bridge (tel: URI + Live Microphone AI Assist Copilot)
 */

window.OGCalling = {
  mode: 'ai', // 'ai' | 'webrtc' | 'tel'
  activeCall: null,
  timerInterval: null,
  audioCtx: null,
  ringInterval: null,
  micStream: null,
  analyser: null,
  visualizerFrame: null,
  recognition: null,
  isMuted: false,
  isOnHold: false,
  isSpeakerOn: true,
  isListening: false,
  peerConnection: null,
  signalingChannel: null,
  wsConnection: null,
  companionWindow: null,
  callbacks: {},

  sopDefinitions: [
    {
      id: 'opening',
      name: 'Opening & Intent Confirm',
      hint: 'Greet customer by name, introduce On-Ground hub, and confirm appliance inquiry.',
      keywords: ['hello', 'hi ', 'good morning', 'good afternoon', 'avani', 'on-ground', 'onground', 'indiranagar', 'whitefield', 'koramangala', 'jayanagar', 'quote', 'speaking', 'calling from', 'visited'],
      quickSay: (lead) => `Hi ${lead.name}, this is Avani calling from On-Ground Bengaluru regarding your ${lead.preferredProduct} inquiry.`
    },
    {
      id: 'discovery',
      name: 'Needs Discovery',
      hint: 'Ask about usage, room/family size, hard-water, or old appliance exchange.',
      keywords: ['family', 'room', 'water', 'hard water', 'exchange', 'old', 'space', 'clearance', 'daily', 'load', 'requirement', 'usage', 'size', 'checking', 'confirm'],
      quickSay: (lead) => `To make sure we lock the best setup for your home, are you also looking to exchange your old appliance and check installation clearance?`
    },
    {
      id: 'pitch',
      name: 'Product Pitch',
      hint: 'Pitch the primary product benefits + recommended cross-sell accessory.',
      keywords: ['whirlpool', 'lg', 'samsung', 'bosch', 'philips', 'inverter', 'front-load', 'dishwasher', 'airfryer', 'fridge', 'washer', 'stabilizer', 'descaler', 'convertible', 'energy', 'star', 'kadhai', 'drum'],
      quickSay: (lead) => `The ${lead.preferredProduct} is our highest-rated model in this segment, and we can bundle the ${lead.crossSell} today.`
    },
    {
      id: 'emi',
      name: 'EMI / Financing Mention',
      hint: 'Anchor with the monthly No-Cost EMI figure and instant cashback/exchange bonus.',
      keywords: ['emi', 'no-cost', 'no cost', 'bajaj', 'hdfc', 'icici', 'monthly', 'per month', '/mo', 'cashback', 'finance', 'split', '3,290', '3290', '6,490', '6490', '4,150', '4150', '3,850', '3850', '2,830', 'zero down'],
      quickSay: (lead) => `You don't need to pay the lump sum upfront — it comes to just ${lead.emi} with ₹3,500 instant exchange bonus.`
    },
    {
      id: 'warranty',
      name: 'Warranty Mention',
      hint: 'Reassure with 10-year motor/compressor/tub warranty & store protection.',
      keywords: ['warranty', '10-year', '10 year', '20-year', '20 year', '5-year', '2-year', 'motor', 'compressor', 'rust', 'pcb', 'amc', 'protection', 'coverage', 'guarantee'],
      quickSay: (lead) => `Plus, this comes with a full 10-year manufacturer warranty on the core motor/compressor and priority On-Ground service support.`
    },
    {
      id: 'closing',
      name: 'Closing / Callback Booking',
      hint: 'Lock the delivery/installation slot or confirm exact callback time.',
      keywords: ['book', 'lock', 'tomorrow', 'slot', 'install', 'installation', 'delivery', 'callback', '4:30', '5:30', '10 am', '11 am', 'payment link', 'invoice', 'whatsapp', 'schedule', 'hold'],
      quickSay: (lead) => `Shall I lock this quote with the exchange bonus and schedule our technician/delivery slot for tomorrow at 10:30 AM?`
    }
  ],

  init(callbacks = {}) {
    this.callbacks = callbacks;
    this.setupSignaling();
  },

  setupSignaling() {
    // 1. BroadcastChannel for zero-config cross-tab / companion window WebRTC signaling
    if ('BroadcastChannel' in window) {
      this.signalingChannel = new BroadcastChannel('onground_webrtc_signaling');
      this.signalingChannel.onmessage = (event) => {
        this.handleSignalingMessage(event.data);
      };
    }

    // 2. WebSocket connection when running with node server.js (enables multi-device LAN calling)
    if (location.protocol.startsWith('http')) {
      try {
        const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProto}//${location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          this.wsConnection = ws;
          ws.send(JSON.stringify({ type: 'register', role: 'agent' }));
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleSignalingMessage(msg);
          } catch (e) {}
        };
        ws.onerror = () => {};
      } catch (e) {}
    }
  },

  sendSignaling(msg) {
    const payload = { ...msg, sender: 'agent', timestamp: Date.now() };
    if (this.signalingChannel) {
      try {
        this.signalingChannel.postMessage(payload);
      } catch (e) {}
    }
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      try {
        this.wsConnection.send(JSON.stringify(payload));
      } catch (e) {}
    }
  },

  ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  },

  playDTMF(digit = '5', duration = 0.11) {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;
    const freqs = {
      '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
      '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
      '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
      '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
      '+': [697, 1209]
    };
    const pair = freqs[String(digit)] || [770, 1336];
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.frequency.value = pair[0];
    osc2.frequency.value = pair[1];
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + duration);
    osc2.stop(ctx.currentTime + duration);
  },

  startRingbackTone(isIncoming = false) {
    this.stopRingbackTone();
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    const playBurst = () => {
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      if (isIncoming) {
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc2.frequency.setValueAtTime(659.25, now); // E5
      } else {
        // Standard Indian PSTN ringback 400Hz + 450Hz
        osc1.frequency.setValueAtTime(400, now);
        osc2.frequency.setValueAtTime(450, now);
      }

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.8);
      osc2.stop(now + 0.8);
    };

    playBurst();
    this.ringInterval = setInterval(playBurst, 1800);
  },

  stopRingbackTone() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  },

  playConnectChime() {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.2);
    });
  },

  /**
   * Starts a live call (AI-to-Human, Human-to-Human WebRTC, or System Tel Bridge)
   */
  async startCall(leadOrCaller, options = {}) {
    this.stopCallCleanup();

    const mode = options.mode || this.mode || 'ai';
    this.mode = mode;

    const lead = this.normalizeLead(leadOrCaller);
    this.activeCall = {
      id: 'call-' + Date.now(),
      leadId: lead.id,
      lead: lead,
      mode: mode,
      direction: options.direction || 'outgoing',
      isPractice: !!options.isPractice,
      status: 'ringing', // 'ringing' | 'connected' | 'ended'
      startedAt: Date.now(),
      connectedAt: null,
      durationSeconds: 0,
      transcript: [],
      sopState: this.sopDefinitions.map(s => ({
        id: s.id,
        name: s.name,
        hint: s.hint,
        passed: false,
        quote: ''
      })),
      agentTurnsSinceSop: 0,
      driftWarning: null,
      sentiment: 'Neutral · Curious',
      sentimentTone: 'blue',
      liveSummary: [
        `Call initiated with ${lead.name} (${lead.phone}) regarding ${lead.preferredProduct}.`
      ],
      aiTurnIndex: 0
    };

    if (this.callbacks.onCallStateChange) {
      this.callbacks.onCallStateChange(this.activeCall);
    }

    // Play dial bursts + ringback tone
    this.playDTMF('9');
    this.startRingbackTone(false);

    // Start microphone stream & audio visualizer
    await this.startMicrophone();

    if (mode === 'tel') {
      // Trigger OS/mobile tel: handler AND connect live AI Assist after 1.5s
      try {
        const cleanPhone = lead.phone.replace(/\s+/g, '');
        const link = document.createElement('a');
        link.href = `tel:${cleanPhone}`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => link.remove(), 500);
      } catch (e) {}

      setTimeout(() => {
        if (this.activeCall && this.activeCall.status === 'ringing') {
          this.onCallConnected();
          this.addTranscriptLine('system', `System Dialer invoked for ${lead.phone}. Live Microphone AI Assist & SOP Tracker active.`);
        }
      }, 1500);
    } else if (mode === 'webrtc') {
      // Signal Companion Customer Phone via WebSocket & BroadcastChannel
      this.sendSignaling({
        type: 'incoming-call',
        callId: this.activeCall.id,
        lead: {
          name: lead.name,
          phone: lead.phone,
          product: lead.preferredProduct,
          emi: lead.emi
        },
        agentName: 'Avani Sharma (On-Ground.ai)'
      });
    } else {
      // AI-to-Human mode: Connect after realistic 2.2s ringback
      setTimeout(() => {
        if (this.activeCall && this.activeCall.status === 'ringing') {
          this.onCallConnected();
          const greeting = (lead.aiPersona && lead.aiPersona.greeting)
            ? lead.aiPersona.greeting
            : `Hello? Yes, this is ${lead.name} speaking. You're calling from On-Ground about the ${lead.preferredProduct}, right?`;
          this.deliverCustomerTurn(greeting);
        }
      }, 2200);
    }

    return this.activeCall;
  },

  normalizeLead(item) {
    if (!item) {
      return {
        id: 'lead-custom',
        name: 'Walk-in Customer',
        fullName: 'Walk-in Customer',
        phone: '+91 98450 00000',
        location: 'Bengaluru South',
        score: 80,
        value: 25000,
        preferredProduct: 'LG 1.5T 5-Star Dual Inverter AC',
        crossSell: 'V-Guard 4kVA Stabilizer + 3yr AMC',
        emi: '6m no-cost EMI · ₹6,490/mo',
        story: 'Inbound store inquiry looking for best price and quick installation.'
      };
    }
    return {
      id: item.id || item.leadId || 'lead-custom',
      name: item.name || 'Customer',
      fullName: item.fullName || item.name || 'Customer',
      phone: item.phone || '+91 98450 11223',
      location: item.location || 'Bengaluru',
      score: item.score || 85,
      value: item.value || 29610,
      preferredProduct: item.preferredProduct || item.product || 'Whirlpool 7kg Front-Load Washer',
      crossSell: item.crossSell || 'Extended Warranty + Stabilizer Kit',
      emi: item.emi || '9m Bajaj No-Cost EMI · ₹3,290/mo',
      story: item.story || item.note || 'High-intent customer inquiring about appliance quote and EMI.',
      aiPersona: item.aiPersona || null
    };
  },

  onCallConnected() {
    if (!this.activeCall || this.activeCall.status === 'connected') return;
    this.stopRingbackTone();
    this.playConnectChime();

    this.activeCall.status = 'connected';
    this.activeCall.connectedAt = Date.now();
    this.activeCall.durationSeconds = 0;

    this.timerInterval = setInterval(() => {
      if (this.activeCall && this.activeCall.status === 'connected' && !this.isOnHold) {
        this.activeCall.durationSeconds++;
        if (this.callbacks.onTimerTick) {
          this.callbacks.onTimerTick(this.activeCall.durationSeconds);
        }
      }
    }, 1000);

    // Start Web Speech API continuous recognition for the Agent's voice
    this.startSpeechRecognition();

    if (this.callbacks.onCallStateChange) {
      this.callbacks.onCallStateChange(this.activeCall);
    }
  },

  async startMicrophone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      const ctx = this.ensureAudioContext();
      if (ctx) {
        const source = ctx.createMediaStreamSource(this.micStream);
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);
        this.runAudioVisualizer();
      }
    } catch (err) {
      // User may not have a mic attached or denied permission; voice synth & typed/chip input still work
      console.info('Microphone stream unavailable, using fallback audio visualizer:', err.message);
    }
  },

  runAudioVisualizer() {
    if (!this.analyser) return;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const tick = () => {
      if (!this.activeCall || this.activeCall.status === 'ended') return;
      this.analyser.getByteFrequencyData(dataArray);
      if (this.callbacks.onAudioLevel) {
        this.callbacks.onAudioLevel(dataArray);
      }
      this.visualizerFrame = requestAnimationFrame(tick);
    };
    this.visualizerFrame = requestAnimationFrame(tick);
  },

  startSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      if (this.recognition) {
        try { this.recognition.stop(); } catch (e) {}
      }
      const rec = new SpeechRec();
      rec.lang = 'en-IN';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        this.isListening = true;
        if (this.callbacks.onMicStatus) this.callbacks.onMicStatus(true);
      };

      rec.onresult = (event) => {
        if (!this.activeCall || this.isMuted || this.isOnHold) return;
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript.trim();
          if (event.results[i].isFinal) {
            if (transcriptText.length > 1) {
              this.handleAgentUtterance(transcriptText, 'voice');
            }
          } else {
            interim += transcriptText + ' ';
          }
        }
        if (this.callbacks.onInterimSpeech) {
          this.callbacks.onInterimSpeech(interim.trim());
        }
      };

      rec.onerror = () => {};
      rec.onend = () => {
        if (this.activeCall && this.activeCall.status === 'connected' && !this.isMuted) {
          try { rec.start(); } catch (e) {}
        } else {
          this.isListening = false;
          if (this.callbacks.onMicStatus) this.callbacks.onMicStatus(false);
        }
      };

      this.recognition = rec;
      rec.start();
    } catch (e) {
      console.info('SpeechRecognition could not start:', e.message);
    }
  },

  /**
   * Processes what the agent said (either via real Microphone STT or Quick-Say / Typed input)
   */
  async handleAgentUtterance(text, source = 'voice') {
    if (!this.activeCall || !text || !text.trim()) return;
    const cleanText = text.trim();

    if (this.callbacks.onInterimSpeech) {
      this.callbacks.onInterimSpeech('');
    }

    this.addTranscriptLine('agent', cleanText, source);

    // If in WebRTC Human-to-Human mode, forward transcript to companion phone too
    if (this.activeCall.mode === 'webrtc') {
      this.sendSignaling({
        type: 'transcript',
        callId: this.activeCall.id,
        speaker: 'agent',
        text: cleanText
      });
    }

    // Evaluate against 6 Live SOP Checkpoints
    this.evaluateLiveSOP(cleanText);

    // If in AI-to-Human mode, generate contextual AI Customer reply & speak it aloud
    if (this.activeCall.mode === 'ai') {
      const reply = await this.generateAICustomerReply(cleanText);
      if (reply && this.activeCall && this.activeCall.status === 'connected') {
        setTimeout(() => {
          if (this.activeCall && this.activeCall.status === 'connected') {
            this.deliverCustomerTurn(reply);
          }
        }, 650);
      }
    }
  },

  evaluateLiveSOP(agentText) {
    if (!this.activeCall) return;
    const lower = agentText.toLowerCase();
    let newlyMatched = 0;

    this.sopDefinitions.forEach((def, idx) => {
      const stateItem = this.activeCall.sopState[idx];
      if (!stateItem.passed) {
        const hit = def.keywords.some(kw => lower.includes(kw));
        if (hit) {
          stateItem.passed = true;
          stateItem.quote = `"${agentText}"`;
          newlyMatched++;
        }
      }
    });

    if (newlyMatched > 0) {
      this.activeCall.agentTurnsSinceSop = 0;
      this.activeCall.driftWarning = null;
    } else {
      this.activeCall.agentTurnsSinceSop++;
      // Trigger "Drifting off SOP" nudge if agent talks without covering next missing SOP step
      const nextMissing = this.activeCall.sopState.find(s => !s.passed);
      if (nextMissing && this.activeCall.agentTurnsSinceSop >= 1) {
        const def = this.sopDefinitions.find(d => d.id === nextMissing.id);
        this.activeCall.driftWarning = {
          stepName: nextMissing.name,
          suggestion: def ? def.quickSay(this.activeCall.lead) : nextMissing.hint
        };
      }
    }

    // Update live auto-drafting summary based on SOP items covered
    const lead = this.activeCall.lead;
    const summaryLines = [
      `Spoke with ${lead.name} (${lead.phone}) regarding ${lead.preferredProduct}.`
    ];
    const sopMap = {};
    this.activeCall.sopState.forEach(s => { sopMap[s.id] = s.passed; });

    if (sopMap.discovery) {
      summaryLines.push(`Verified household requirements, space clearance & old unit exchange eligibility.`);
    }
    if (sopMap.pitch) {
      summaryLines.push(`Pitched ${lead.preferredProduct} along with ${lead.crossSell}.`);
    }
    if (sopMap.emi) {
      summaryLines.push(`Customer reviewed ${lead.emi} + instant exchange bonus.`);
      this.activeCall.sentiment = 'Positive · Interested in EMI';
      this.activeCall.sentimentTone = 'green';
    }
    if (sopMap.warranty) {
      summaryLines.push(`Reassured customer on 10-year motor/compressor warranty coverage.`);
      this.activeCall.sentiment = 'High Trust · Objection Resolved';
      this.activeCall.sentimentTone = 'green';
    }
    if (sopMap.closing) {
      summaryLines.push(`Locked quote and confirmed next-day delivery/installation callback slot.`);
      this.activeCall.sentiment = 'Ready to Close ✓';
      this.activeCall.sentimentTone = 'green';
    }

    this.activeCall.liveSummary = summaryLines;

    if (this.callbacks.onSOPUpdate) {
      this.callbacks.onSOPUpdate(this.activeCall);
    }
  },

  async generateAICustomerReply(agentText) {
    if (!this.activeCall) return '';
    const lead = this.activeCall.lead;
    const lower = agentText.toLowerCase();

    // Try backend AI endpoint first if running on node server.js
    if (location.protocol.startsWith('http')) {
      try {
        const resp = await fetch('/api/ai-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead,
            agentText,
            transcript: this.activeCall.transcript,
            sopState: this.activeCall.sopState
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.reply) return data.reply;
        }
      } catch (e) {}
    }

    // Built-in intelligent persona state machine
    const persona = lead.aiPersona || {};
    if (lower.includes('book') || lower.includes('slot') || lower.includes('tomorrow') || lower.includes('lock') || lower.includes('schedule') || lower.includes('payment')) {
      return persona.closingResponse || `That works great for me! Please lock the offer on the ${lead.preferredProduct} and send me the booking confirmation on WhatsApp.`;
    }
    if (lower.includes('warranty') || lower.includes('10-year') || lower.includes('10 year') || lower.includes('20-year') || lower.includes('motor') || lower.includes('rust') || lower.includes('descaler')) {
      return persona.warrantyResponse || `Knowing it has a 10-year warranty and store service support definitely resolves my concern. Can we lock the installation slot for tomorrow?`;
    }
    if (lower.includes('emi') || lower.includes('bajaj') || lower.includes('hdfc') || lower.includes('icici') || lower.includes('month') || lower.includes('cashback') || lower.includes('3,290') || lower.includes('6,490') || lower.includes('4,150') || lower.includes('3,850')) {
      return persona.emiResponse || `That monthly no-cost EMI split is much easier on my budget than paying all at once. What about the warranty on the motor?`;
    }
    if (lower.includes('whirlpool') || lower.includes('lg') || lower.includes('samsung') || lower.includes('bosch') || lower.includes('philips') || lower.includes('stabilizer') || lower.includes('feature') || lower.includes('exchange')) {
      return `The ${lead.preferredProduct} features sound good, but what is the best monthly EMI or exchange discount you can give me today?`;
    }
    if (this.activeCall.aiTurnIndex === 0) {
      this.activeCall.aiTurnIndex++;
      return persona.objection || `Yes, I visited the store recently for the ${lead.preferredProduct}, but I was holding back to check the final price after exchange and EMI options.`;
    }
    this.activeCall.aiTurnIndex++;
    return `Got it. Can you also tell me about the no-cost EMI monthly breakdown and the warranty coverage on ${lead.preferredProduct}?`;
  },

  deliverCustomerTurn(text) {
    if (!this.activeCall || this.activeCall.status !== 'connected') return;
    this.addTranscriptLine('customer', text, 'voice');
    this.speakText(text);
  },

  speakText(text) {
    if (!this.isSpeakerOn || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India') || v.name.includes('Ravi') || v.name.includes('Heera') || v.name.includes('Neerja'));
      if (indianVoice) {
        utter.voice = indianVoice;
      }
      utter.lang = 'en-IN';
      utter.rate = 1.02;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  },

  addTranscriptLine(speaker, text, mode = 'voice') {
    if (!this.activeCall) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = {
      id: 'tr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      speaker, // 'agent' | 'customer' | 'system'
      speakerName: speaker === 'agent' ? 'Avani (You)' : (speaker === 'customer' ? this.activeCall.lead.name : 'Voice Bridge'),
      text,
      time: timeStr,
      mode
    };
    this.activeCall.transcript.push(entry);
    if (this.callbacks.onTranscriptEntry) {
      this.callbacks.onTranscriptEntry(entry, this.activeCall);
    }
  },

  /**
   * WebRTC Human-to-Human Signaling Handler
   */
  async handleSignalingMessage(msg) {
    if (!msg || msg.sender === 'agent') return;

    if (msg.type === 'companion-ready') {
      if (this.callbacks.onCompanionStatus) {
        this.callbacks.onCompanionStatus(true);
      }
      // If we are currently ringing in webrtc mode, re-broadcast the incoming call
      if (this.activeCall && this.activeCall.mode === 'webrtc' && this.activeCall.status === 'ringing') {
        this.sendSignaling({
          type: 'incoming-call',
          callId: this.activeCall.id,
          lead: {
            name: this.activeCall.lead.name,
            phone: this.activeCall.lead.phone,
            product: this.activeCall.lead.preferredProduct,
            emi: this.activeCall.lead.emi
          },
          agentName: 'Avani Sharma (On-Ground.ai)'
        });
      }
    } else if (msg.type === 'call-accepted') {
      if (this.activeCall && this.activeCall.status === 'ringing') {
        this.onCallConnected();
        this.addTranscriptLine('system', `Human-to-Human WebRTC voice channel connected with ${this.activeCall.lead.name}.`);
        await this.initiateWebRTCOffer();
      }
    } else if (msg.type === 'webrtc-answer') {
      if (this.peerConnection && msg.sdp) {
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        } catch (e) {}
      }
    } else if (msg.type === 'webrtc-ice') {
      if (this.peerConnection && msg.candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch (e) {}
      }
    } else if (msg.type === 'transcript' && msg.speaker === 'customer') {
      if (this.activeCall && this.activeCall.status === 'connected') {
        this.addTranscriptLine('customer', msg.text, 'webrtc');
      }
    } else if (msg.type === 'call-ended') {
      if (this.activeCall && this.activeCall.status !== 'ended') {
        this.endCall();
      }
    } else if (msg.type === 'customer-inbound-call') {
      // Companion phone initiated a real human-to-human inbound call to the Call Centre!
      if (this.callbacks.onInboundHumanCall) {
        this.callbacks.onInboundHumanCall(msg.lead);
      }
    }
  },

  async initiateWebRTCOffer() {
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      if (this.micStream) {
        this.micStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.micStream);
        });
      }

      this.peerConnection.ontrack = (event) => {
        let remoteAudio = document.getElementById('og-remote-webrtc-audio');
        if (!remoteAudio) {
          remoteAudio = document.createElement('audio');
          remoteAudio.id = 'og-remote-webrtc-audio';
          remoteAudio.autoplay = true;
          document.body.appendChild(remoteAudio);
        }
        remoteAudio.srcObject = event.streams[0];
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignaling({
            type: 'webrtc-ice',
            candidate: event.candidate
          });
        }
      };

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.sendSignaling({
        type: 'webrtc-offer',
        sdp: offer
      });
    } catch (e) {
      console.warn('WebRTC offer setup warning:', e.message);
    }
  },

  openCompanionPhone() {
    const url = './companion.html';
    this.companionWindow = window.open(url, 'OnGroundCompanionPhone', 'width=420,height=740,left=920,top=60');
    return this.companionWindow;
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach(t => { t.enabled = !this.isMuted; });
    }
    return this.isMuted;
  },

  toggleHold() {
    this.isOnHold = !this.isOnHold;
    return this.isOnHold;
  },

  toggleSpeaker() {
    this.isSpeakerOn = !this.isSpeakerOn;
    if (!this.isSpeakerOn && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    return this.isSpeakerOn;
  },

  endCall() {
    if (!this.activeCall) return null;
    const finishedCall = { ...this.activeCall, status: 'ended' };

    this.sendSignaling({
      type: 'call-ended',
      callId: this.activeCall.id
    });

    this.stopCallCleanup();

    if (this.callbacks.onCallEnded) {
      this.callbacks.onCallEnded(finishedCall);
    }
    return finishedCall;
  },

  stopCallCleanup() {
    this.stopRingbackTone();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.visualizerFrame) {
      cancelAnimationFrame(this.visualizerFrame);
      this.visualizerFrame = null;
    }
    if (this.recognition) {
      const r = this.recognition;
      this.recognition = null;
      try { r.stop(); } catch (e) {}
    }
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (e) {}
      this.peerConnection = null;
    }
    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      this.micStream = null;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    this.activeCall = null;
    this.isMuted = false;
    this.isOnHold = false;
  },

  formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  }
};
