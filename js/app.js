/**
 * On-Ground.ai Call Centre — Main Application Controller (js/app.js)
 * Implements all screens, modals, Chart.js visualizations, Pulse chat, Leads paging,
 * and integrates with OGCalling (AI-to-Human & Human-to-Human WebRTC calling).
 */

window.OGApp = {
  currentView: 'dashboard', // 'dashboard' | 'plan-outgoing' | 'plan-incoming' | 'plan-recent' | 'active-call' | 'calendar' | 'pulse-home' | 'pulse-channel'
  dateRangeKey: 'today',
  outgoingPage: 1,
  outgoingPerPage: 2,
  outgoingShowAll: false,
  expandedLeadIds: { 'lead-ritu': true },
  activeChannelId: 'callcentre-team',
  activeLeadIndex: 0,
  icpBreakdownOpen: false,
  customAgentsOpen: false,
  calMonth: 10, // 0-indexed: 10 = Nov
  calYear: 2026,
  calSelectedDay: 3,
  charts: {
    callsChart: null,
    csatChart: null,
    radarChart: null
  },
  pendingIncomingLead: null,

  async init() {
    await window.OGStore.init();

    window.OGCalling.init({
      onCallStateChange: (call) => this.handleCallStateChange(call),
      onTimerTick: (sec) => this.updateActiveCallTimer(sec),
      onTranscriptEntry: (entry, call) => this.appendLiveTranscript(entry, call),
      onSOPUpdate: (call) => this.renderLiveSOPPanel(call),
      onInterimSpeech: (text) => this.updateInterimSpeech(text),
      onAudioLevel: (freqData) => this.updateVisualizerBars(freqData),
      onCallEnded: (finishedCall) => this.openCallWrapupModal(finishedCall),
      onInboundHumanCall: (leadInfo) => this.triggerIncomingBanner(leadInfo, 'webrtc')
    });

    this.bindGlobalEvents();
    this.syncTopbarBadges();
    this.navigate('dashboard');
  },

  get data() {
    return window.OGStore.data;
  },

  saveData() {
    window.OGStore.save();
    this.syncTopbarBadges();
  },

  bindGlobalEvents() {
    // Sidebar navigation
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav');
        if (target === 'practice-call') {
          this.startPracticeCallBanner();
        } else {
          this.navigate(target);
        }
        document.getElementById('sidebar').classList.remove('mobile-open');
      });
    });

    // Mobile hamburger menu
    const mobBtn = document.getElementById('mobileMenuBtn');
    if (mobBtn) {
      mobBtn.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('mobile-open');
      });
    }

    // Calling mode selector in sidebar
    const modeSel = document.getElementById('callingModeSelect');
    if (modeSel) {
      modeSel.addEventListener('change', (e) => {
        window.OGCalling.mode = e.target.value;
        this.toast(`Calling mode set to: ${e.target.options[e.target.selectedIndex].text}`);
      });
    }

    // Companion phone launcher button
    const compBtn = document.getElementById('launchCompanionBtn');
    if (compBtn) {
      compBtn.addEventListener('click', () => {
        window.OGCalling.mode = 'webrtc';
        const sel = document.getElementById('callingModeSelect');
        if (sel) sel.value = 'webrtc';
        window.OGCalling.openCompanionPhone();
        this.toast('Opened Companion Customer Handset for Human-to-Human WebRTC calling');
      });
    }

    // Close modals on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', (e) => {
        if (e.target === bd) bd.classList.remove('open');
      });
    });
  },

  syncTopbarBadges() {
    const d = this.data;
    if (!d) return;

    const unreadNotifs = (d.notifications || []).filter(n => n.unread).length;
    const bellDot = document.getElementById('notifCountDot');
    if (bellDot) {
      bellDot.textContent = unreadNotifs;
      bellDot.style.display = unreadNotifs > 0 ? 'flex' : 'none';
    }

    const ogVal = document.getElementById('topOgScoreVal');
    if (ogVal) ogVal.textContent = d.agent.ogScore;

    const rankVal = document.getElementById('topRankVal');
    if (rankVal) rankVal.textContent = `#${d.agent.rank}`;

    const avVal = document.getElementById('topAvatarLabel');
    if (avVal) avVal.textContent = d.agent.sellingAvatar;

    const missedBadge = document.getElementById('navMissedBadge');
    if (missedBadge) {
      const cnt = (d.missedCalls || []).length;
      missedBadge.textContent = cnt;
      missedBadge.style.display = cnt > 0 ? 'inline-block' : 'none';
    }
  },

  navigate(view, params = {}) {
    this.currentView = view;
    if (params.channelId) {
      this.activeChannelId = params.channelId;
    }

    // Update sidebar active state
    document.querySelectorAll('[data-nav]').forEach(el => {
      const nav = el.getAttribute('data-nav');
      el.classList.toggle('active', nav === view || (view === 'pulse-channel' && nav === 'pulse-home'));
    });

    // Update mobile bottom nav active state
    document.querySelectorAll('.mob-nav-btn').forEach(el => {
      const nav = el.getAttribute('data-nav');
      el.classList.toggle('active', nav === view);
    });

    const container = document.getElementById('workspaceContent');
    if (!container) return;

    if (view === 'dashboard') {
      this.renderDashboard(container);
    } else if (view === 'plan-outgoing') {
      this.renderPlanOutgoing(container);
    } else if (view === 'plan-incoming') {
      this.renderPlanIncoming(container);
    } else if (view === 'plan-recent') {
      this.renderPlanRecent(container);
    } else if (view === 'active-call') {
      this.renderActiveCallScreen(container);
    } else if (view === 'calendar') {
      this.renderCalendar(container);
    } else if (view === 'pulse-home') {
      this.renderPulseHome(container);
    } else if (view === 'pulse-channel') {
      this.renderPulseChannel(container, this.activeChannelId);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /* ============================================================
     SCREEN 1: DASHBOARD
     ============================================================ */
  renderDashboard(container) {
    const d = this.data;
    const range = d.kpiRanges[this.dateRangeKey] || d.kpiRanges.today;
    const earnPct = Math.min(100, Math.round((d.agent.earnings.current / d.agent.earnings.target) * 100));
    const pendingTasks = d.tasks.filter(t => !t.completed).length;

    container.innerHTML = `
      <!-- Command-Center Indigo Hero -->
      <section class="cc-hero">
        <div class="cc-hero-top">
          <div>
            <div class="cc-hero-greeting">
              <span class="cc-hero-title">Good morning, ${d.agent.name}</span>
              <span class="cc-rank-badge" onclick="OGApp.openLeaderboardModal()">⭐ #${d.agent.rank} of ${d.agent.totalAgents}</span>
            </div>
            <div class="cc-hero-sub">${range.subLabel} · Selling Avatar: <strong>${d.agent.sellingAvatar}</strong></div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="cc-date-btn" onclick="OGApp.openDateRangeModal()">
              📅 <span>${range.label}</span> ▾
            </button>
          </div>
        </div>

        <div class="cc-kpi-grid">
          <div class="cc-kpi-card" onclick="OGApp.openOgScoreModal()">
            <div class="cc-kpi-label">OG Score™</div>
            <div class="cc-kpi-val green">${range.ogScore}</div>
            <div class="cc-kpi-sub">${range.ogDelta} · Tap for radar</div>
          </div>
          <div class="cc-kpi-card" onclick="OGApp.navigate('plan-recent')">
            <div class="cc-kpi-label">Avg Handle Time</div>
            <div class="cc-kpi-val cyan">${range.aht}</div>
            <div class="cc-kpi-sub">${range.ahtDelta}</div>
          </div>
          <div class="cc-kpi-card" onclick="OGApp.openKudosModal()">
            <div class="cc-kpi-label">CSAT Today</div>
            <div class="cc-kpi-val green">${range.csat}</div>
            <div class="cc-kpi-sub">${range.csatDelta}</div>
          </div>
          <div class="cc-kpi-card" onclick="OGApp.navigate('plan-incoming')">
            <div class="cc-kpi-label">In Queue</div>
            <div class="cc-kpi-val amber">${d.waitingQueue.length}</div>
            <div class="cc-kpi-sub">${range.queueSub}</div>
          </div>
        </div>
      </section>

      <!-- 2-Column Middle Grid -->
      <div class="dash-mid-grid">
        <!-- Left Column: My Progress + Who's waiting -->
        <div class="dash-col">
          <div class="surface-card">
            <div class="card-head">
              <span class="card-title">My Progress · ${range.label.toLowerCase()}</span>
              <button class="card-link" onclick="OGApp.openLeadsModal(0)">Inspect all 5 leads →</button>
            </div>
            <div class="progress-tiles">
              <div class="prog-tile" onclick="OGApp.openLeadsModal(0)">
                <div>
                  <div class="prog-num">${range.leadsCreated}</div>
                  <div class="prog-lbl">Leads Created</div>
                </div>
                <span style="font-size:16px; color:#16a34a;">↗</span>
              </div>
              <div class="prog-tile" onclick="OGApp.openLeadsModal(1)">
                <div>
                  <div class="prog-num">${range.leadsCalled}</div>
                  <div class="prog-lbl">Leads Called</div>
                </div>
                <span style="font-size:16px; color:#2563eb;">📞</span>
              </div>
            </div>
          </div>

          <div class="surface-card">
            <div class="card-head">
              <span class="card-title">Who's waiting (${d.waitingQueue.length})</span>
              <button class="card-link" onclick="OGApp.navigate('plan-outgoing')">Open planner →</button>
            </div>
            <div class="wait-list">
              ${d.waitingQueue.map(w => `
                <div class="wait-row">
                  <div class="wait-info">
                    <span class="wait-dot"></span>
                    <div>
                      <div class="wait-name">${w.name}</div>
                      <div class="wait-meta">${w.topic} · ${w.phone}</div>
                    </div>
                  </div>
                  <div class="wait-right">
                    <span class="wait-pill">${w.wait}</span>
                    <button class="btn-primary-call" onclick="OGApp.initiateCallFlow('${w.id}', 'queue')">📞 Call</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Right Column: My Earnings + My Tasks -->
        <div class="dash-col">
          <div class="surface-card earnings-card" onclick="OGApp.openEarningsModal()" style="cursor:pointer;">
            <div class="card-head">
              <span class="card-title">My earnings this month</span>
              <span class="score-pill high">${earnPct}% of target</span>
            </div>
            <div class="earnings-val">₹${d.agent.earnings.current.toLocaleString('en-IN')}</div>
            <div class="earnings-bar-track">
              <div class="earnings-bar-fill" style="width:${earnPct}%;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-secondary);">
              <span>Target: ₹${d.agent.earnings.target.toLocaleString('en-IN')}</span>
              <span>+₹3,800 to unlock Super-Slab →</span>
            </div>
          </div>

          <div class="tasks-card">
            <div class="card-head" style="margin-bottom:4px;">
              <span class="card-title">⚡ My Tasks (${pendingTasks} pending)</span>
              <button class="card-link" style="color:#fde68a;" onclick="OGApp.navigate('pulse-home')">Open Pulse →</button>
            </div>
            <div class="tasks-sub">Click any item to answer the pinned "Needs your input" card in Pulse</div>
            <div class="tasks-chips-grid">
              ${d.tasks.map(t => `
                <div class="task-chip-box ${t.completed ? 'done' : ''}" onclick="OGApp.navigate('pulse-channel', { channelId: '${t.channelId}' })">
                  <span class="task-chip-count">${t.completed ? '✓ Done' : t.countLabel}</span>
                  <span class="task-chip-desc" title="${t.title}">${t.title}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Full-width 7-day Charts (Chart.js) -->
      <div class="charts-stack">
        <div class="surface-card">
          <div class="card-head">
            <span class="card-title">Calls handled · last 7 days</span>
            <span style="font-size:11px; color:var(--text-muted);">Avg 22.4 calls/day · Target 20</span>
          </div>
          <div class="chart-wrap">
            <canvas id="callsHandledCanvas"></canvas>
          </div>
        </div>

        <div class="surface-card">
          <div class="card-head">
            <span class="card-title">CSAT trend · last 7 days</span>
            <span style="font-size:11px; color:var(--text-muted);">Current ${range.csat} · Hub Benchmark 88%</span>
          </div>
          <div class="chart-wrap">
            <canvas id="csatTrendCanvas"></canvas>
          </div>
        </div>
      </div>
    `;

    this.renderDashboardCharts(range);
  },

  renderDashboardCharts(range) {
    if (typeof Chart === 'undefined') return;
    const labels = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Today'];

    if (this.charts.callsChart) {
      this.charts.callsChart.destroy();
    }
    if (this.charts.csatChart) {
      this.charts.csatChart.destroy();
    }

    const callsCtx = document.getElementById('callsHandledCanvas');
    if (callsCtx) {
      this.charts.callsChart = new Chart(callsCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Calls Handled',
            data: range.callsChart || [18, 22, 19, 25, 24, 21, 28],
            backgroundColor: '#16a34a',
            borderRadius: 6,
            maxBarThickness: 38
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
            x: { grid: { display: false }, ticks: { font: { size: 11 } } }
          }
        }
      });
    }

    const csatCtx = document.getElementById('csatTrendCanvas');
    if (csatCtx) {
      this.charts.csatChart = new Chart(csatCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'CSAT %',
            data: range.csatChart || [88, 90, 89, 92, 91, 93, 94],
            backgroundColor: '#2563eb',
            borderRadius: 6,
            maxBarThickness: 38
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 75, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, callback: (v) => v + '%' } },
            x: { grid: { display: false }, ticks: { font: { size: 11 } } }
          }
        }
      });
    }
  },

  /* ============================================================
     SCREEN 2A: PLAN -> CALLS TO MAKE (OUTGOING)
     ============================================================ */
  renderPlanOutgoing(container) {
    const sortedLeads = [...this.data.leads].sort((a, b) => b.score - a.score);
    const totalPages = Math.ceil(sortedLeads.length / this.outgoingPerPage);
    if (this.outgoingPage > totalPages) this.outgoingPage = 1;

    const visibleLeads = this.outgoingShowAll
      ? sortedLeads
      : sortedLeads.slice((this.outgoingPage - 1) * this.outgoingPerPage, this.outgoingPage * this.outgoingPerPage);

    container.innerHTML = `
      ${this.renderPlanHeader('plan-outgoing', 'Today\'s calling plan · Outgoing', 'Ranked by AI Lead Attractiveness & ICP Fit Score')}

      <div class="call-list-card">
        <div class="call-list-header">
          <div>
            <span class="card-title">Planned outgoing calls (${sortedLeads.length})</span>
            <span style="font-size:11.5px; color:var(--text-muted); margin-left:8px;">Tap any row to view story, cross-sell & EMI plan</span>
          </div>
          <button class="btn-secondary-sm" onclick="OGApp.toggleOutgoingShowAll()">
            ${this.outgoingShowAll ? 'Show Paged (2/page)' : 'Show All 5'}
          </button>
        </div>

        ${visibleLeads.map(lead => {
          const isExp = !!this.expandedLeadIds[lead.id];
          const tone = lead.score >= 80 ? 'high' : (lead.score >= 50 ? 'med' : 'low');
          const leadIdx = this.data.leads.findIndex(l => l.id === lead.id);
          return `
            <div class="call-row ${isExp ? 'expanded' : ''}">
              <div class="call-row-summary" onclick="OGApp.toggleExpandLead('${lead.id}')">
                <div class="call-row-left">
                  <span class="score-pill ${tone}">${lead.score}</span>
                  <div>
                    <div class="caller-primary">
                      <span>${lead.name}</span>
                      <span class="outcome-tag ${lead.status === 'OPEN' ? 'green' : (lead.status === 'AGEING' ? 'amber' : 'gray')}">${lead.status}</span>
                      <span style="font-size:11px; color:var(--text-muted); font-weight:500;">SLA: ${lead.sla}</span>
                    </div>
                    <div class="caller-secondary">${lead.preferredProduct} · ₹${lead.value.toLocaleString('en-IN')} · ${lead.location}</div>
                  </div>
                </div>
                <div class="call-row-right" onclick="event.stopPropagation()">
                  <button class="btn-secondary-sm" onclick="OGApp.openLeadsModal(${leadIdx})">Lead Card</button>
                  <button class="btn-primary-call" onclick="OGApp.openPreCallChecklist('${lead.id}')">📞 Place call</button>
                </div>
              </div>

              <div class="call-row-details">
                <div class="detail-grid-4">
                  <div class="detail-item">
                    <div class="detail-lbl">Story so far</div>
                    <div class="detail-val">${lead.story}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-lbl">Preferred product</div>
                    <div class="detail-val">${lead.preferredProduct} (₹${lead.value.toLocaleString('en-IN')})</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-lbl">Cross-sell recommendation</div>
                    <div class="detail-val">${lead.crossSell}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-lbl">EMI / financing</div>
                    <div class="detail-val">${lead.emi}</div>
                  </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                  <span style="font-size:11.5px; color:var(--text-secondary);">📞 <strong>${lead.phone}</strong> · Best window: ${lead.bestTime} · Lang: ${lead.language}</span>
                  <div style="display:flex; gap:8px;">
                    <button class="btn-secondary-sm" onclick="OGApp.openCustomerDiscussionsModal('${lead.id}')">💬 WhatsApp Quote</button>
                    <button class="btn-primary-call" onclick="OGApp.initiateCallFlow('${lead.id}', 'lead')">⚡ Direct Call Now</button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}

        ${!this.outgoingShowAll ? `
          <div class="pagination-bar">
            <span>Page <strong>${this.outgoingPage}</strong> of <strong>${totalPages}</strong> (${sortedLeads.length} ranked leads)</span>
            <div style="display:flex; gap:6px;">
              <button class="btn-secondary-sm" ${this.outgoingPage <= 1 ? 'disabled' : ''} onclick="OGApp.changeOutgoingPage(-1)">← Prev</button>
              <button class="btn-secondary-sm" ${this.outgoingPage >= totalPages ? 'disabled' : ''} onclick="OGApp.changeOutgoingPage(1)">Next →</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  renderPlanHeader(activeTab, title, subtitle) {
    return `
      <div class="section-banner">
        <div>
          <div class="section-banner-title">${title}</div>
          <div class="section-banner-sub">${subtitle}</div>
        </div>
        <div class="plan-tabs-bar">
          <button class="plan-tab-btn ${activeTab === 'plan-outgoing' ? 'active' : ''}" onclick="OGApp.navigate('plan-outgoing')">Calls to make</button>
          <button class="plan-tab-btn ${activeTab === 'plan-incoming' ? 'active' : ''}" onclick="OGApp.navigate('plan-incoming')">Incoming (${this.data.missedCalls.length})</button>
          <button class="plan-tab-btn ${activeTab === 'plan-recent' ? 'active' : ''}" onclick="OGApp.navigate('plan-recent')">Recent (${this.data.recentCalls.length})</button>
          <button class="plan-tab-btn" style="color:#fde68a;" onclick="OGApp.startPracticeCallBanner()">🎙️ Practise a call</button>
        </div>
      </div>
    `;
  },

  toggleExpandLead(leadId) {
    this.expandedLeadIds[leadId] = !this.expandedLeadIds[leadId];
    this.renderPlanOutgoing(document.getElementById('workspaceContent'));
  },

  changeOutgoingPage(delta) {
    this.outgoingPage += delta;
    this.renderPlanOutgoing(document.getElementById('workspaceContent'));
  },

  toggleOutgoingShowAll() {
    this.outgoingShowAll = !this.outgoingShowAll;
    this.renderPlanOutgoing(document.getElementById('workspaceContent'));
  },

  /* ============================================================
     SCREEN 2B: PLAN -> INCOMING (MISSED CALLS)
     ============================================================ */
  renderPlanIncoming(container) {
    const missed = this.data.missedCalls || [];
    const totalStake = missed.reduce((acc, m) => acc + (m.value || 0), 0);

    container.innerHTML = `
      ${this.renderPlanHeader('plan-incoming', 'Incoming · Missed calls queue', 'Call back within 30 minutes to protect store walk-in conversion')}

      <div class="missed-summary-grid">
        <div class="missed-stat-card">
          <div>
            <div class="detail-lbl">Missed today</div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">Unanswered inbound store & quote calls</div>
          </div>
          <div class="missed-stat-num">${missed.length}</div>
        </div>
        <div class="missed-stat-card">
          <div>
            <div class="detail-lbl">Expected value at stake</div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">Pipeline across missed callers</div>
          </div>
          <div class="missed-stat-num money">₹${totalStake.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div class="call-list-card">
        <div class="call-list-header">
          <span class="card-title">Ranked missed calls (${missed.length})</span>
          <span style="font-size:11.5px; color:var(--text-muted);">Sorted by lead urgency & basket size</span>
        </div>

        ${missed.length === 0 ? `
          <div style="padding:28px; text-align:center; color:var(--text-muted);">
            🎉 All missed calls have been called back! Expected value at stake is ₹0.
          </div>
        ` : missed.map(mc => {
          const tone = mc.score >= 80 ? 'high' : (mc.score >= 55 ? 'med' : 'low');
          const valLabel = mc.value > 0 ? `₹${mc.value.toLocaleString('en-IN')}` : (mc.displayValue || 'Follow-up');
          return `
            <div class="call-row">
              <div class="call-row-summary" onclick="OGApp.initiateCallFlow('${mc.id}', 'missed')">
                <div class="call-row-left">
                  <span class="score-pill ${tone}">${mc.score}</span>
                  <div>
                    <div class="caller-primary">
                      <span>${mc.name}</span>
                      <span class="outcome-tag red">↙ Missed ${mc.timeAgo}</span>
                      <span class="outcome-tag amber">${valLabel}</span>
                    </div>
                    <div class="caller-secondary">${mc.product} · ${mc.phone} · ${mc.note}</div>
                  </div>
                </div>
                <div class="call-row-right" onclick="event.stopPropagation()">
                  <button class="btn-primary-call" onclick="OGApp.initiateCallFlow('${mc.id}', 'missed')">📞 Call back</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /* ============================================================
     SCREEN 2C: PLAN -> RECENT CALLS (WITH SOP REVIEW MODAL)
     ============================================================ */
  renderPlanRecent(container) {
    const recents = this.data.recentCalls || [];

    container.innerHTML = `
      ${this.renderPlanHeader('plan-recent', 'Recent calls & SOP audits', 'Click any call row to inspect its 6-point SOP Review & transcript quotes')}

      <div class="call-list-card">
        <div class="call-list-header">
          <span class="card-title">Recent call log (${recents.length})</span>
          <span style="font-size:11.5px; color:var(--text-muted);">Tap any call for AI SOP Review</span>
        </div>

        ${recents.map(rc => {
          const dirIcon = rc.direction === 'incoming' ? '↙ Incoming' : (rc.direction === 'outgoing' ? '↗ Outgoing' : '✕ Missed');
          return `
            <div class="call-row">
              <div class="call-row-summary" onclick="OGApp.openSopReviewModal('${rc.id}')">
                <div class="call-row-left">
                  <span class="score-pill ${rc.sopScore === '6/6' || rc.sopScore === '5/6' ? 'high' : (rc.sopScore === '0/6' ? 'low' : 'med')}">${rc.sopScore}</span>
                  <div>
                    <div class="caller-primary">
                      <span>${rc.name}</span>
                      <span class="outcome-tag ${rc.outcomeTone || 'gray'}">${rc.outcome}</span>
                    </div>
                    <div class="caller-secondary">${dirIcon} · ${rc.time} · Duration: <strong>${rc.duration}</strong> · ${rc.product}</div>
                  </div>
                </div>
                <div class="call-row-right" onclick="event.stopPropagation()">
                  <button class="btn-secondary-sm" onclick="OGApp.openSopReviewModal('${rc.id}')">📋 SOP Review</button>
                  <button class="btn-primary-call" onclick="OGApp.initiateCallFlow('${rc.id}', 'recent')">📞 Call</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /* ============================================================
     CALL INITIATION, PRE-CALL SOP CHECKLIST & ACTIVE CALL SCREEN
     ============================================================ */
  openPreCallChecklist(leadId) {
    const lead = this.data.leads.find(l => l.id === leadId) || this.data.leads[0];
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:#d8b4fe; font-weight:700;">Pre-Call SOP Readiness Check</div>
            <div style="font-size:16px; font-weight:700; margin-top:2px;">Before you call ${lead.name} (${lead.phone})</div>
          </div>
          <button class="ac-ctrl-btn" onclick="OGApp.closeModal('genericModal')">✕</button>
        </div>
      </div>
      <div class="modal-body-scroll">
        <div class="detail-item" style="background:#f0fdf4; border-color:#86efac;">
          <div class="detail-lbl" style="color:#166534;">Target Product & Offer</div>
          <div class="detail-val" style="font-weight:700;">${lead.preferredProduct} · ₹${lead.value.toLocaleString('en-IN')}</div>
          <div style="font-size:11.5px; color:#15803d; margin-top:3px;">EMI: ${lead.emi} · Cross-sell: ${lead.crossSell}</div>
        </div>

        <div style="font-size:12px; font-weight:700; color:var(--text-main);">Verify Pre-Call SOP Checklist:</div>
        ${(lead.beforeYouReachOut || []).map((item, i) => `
          <label style="display:flex; align-items:flex-start; gap:8px; padding:8px 10px; background:var(--bg-subtle); border:1px solid var(--border-light); border-radius:8px; cursor:pointer;">
            <input type="checkbox" checked style="margin-top:3px;" />
            <span style="font-size:12px;">${item}</span>
          </label>
        `).join('')}

        <div class="detail-item">
          <div class="detail-lbl">Select Real Calling Transport</div>
          <select id="modalCallModeSelect" style="width:100%; margin-top:6px; padding:8px; border-radius:8px; border:1px solid var(--border-med);">
            <option value="ai" ${window.OGCalling.mode === 'ai' ? 'selected' : ''}>🎙️ AI-to-Human Live Voice Call (Mic STT + Contextual AI Customer Voice + Live SOP)</option>
            <option value="webrtc" ${window.OGCalling.mode === 'webrtc' ? 'selected' : ''}>👥 Human-to-Human Live WebRTC Call (Rings Companion Customer Phone Window)</option>
            <option value="tel" ${window.OGCalling.mode === 'tel' ? 'selected' : ''}>📲 System / Cellular Phone Dialer (tel:${lead.phone} + Live AI Assist)</option>
          </select>
        </div>
      </div>
      <div class="modal-footer-bar">
        <button class="btn-secondary-sm" onclick="OGApp.openCompanionAndCall('${lead.id}')">👥 Open Companion Phone + Call</button>
        <button class="btn-primary-call" onclick="OGApp.confirmPreCallAndDial('${lead.id}')">📞 Start Live Call Now</button>
      </div>
    `;
    modal.classList.add('open');
  },

  confirmPreCallAndDial(leadId) {
    const modeSel = document.getElementById('modalCallModeSelect');
    if (modeSel) {
      window.OGCalling.mode = modeSel.value;
      const sideSel = document.getElementById('callingModeSelect');
      if (sideSel) sideSel.value = modeSel.value;
    }
    this.closeModal('genericModal');
    this.initiateCallFlow(leadId, 'lead');
  },

  openCompanionAndCall(leadId) {
    window.OGCalling.mode = 'webrtc';
    const sideSel = document.getElementById('callingModeSelect');
    if (sideSel) sideSel.value = 'webrtc';
    window.OGCalling.openCompanionPhone();
    this.closeModal('genericModal');
    setTimeout(() => {
      this.initiateCallFlow(leadId, 'lead');
    }, 500);
  },

  initiateCallFlow(itemId, sourceType = 'lead') {
    let targetLead = null;

    if (sourceType === 'lead') {
      targetLead = this.data.leads.find(l => l.id === itemId);
    } else if (sourceType === 'queue') {
      const q = this.data.waitingQueue.find(w => w.id === itemId);
      if (q) {
        targetLead = {
          id: q.id,
          name: q.name,
          phone: q.phone,
          preferredProduct: q.product,
          crossSell: q.crossSell,
          emi: q.emi,
          story: q.story,
          score: q.score,
          value: 38940
        };
        // Remove from waiting queue once called
        this.data.waitingQueue = this.data.waitingQueue.filter(w => w.id !== itemId);
        this.saveData();
      }
    } else if (sourceType === 'missed') {
      const mc = this.data.missedCalls.find(m => m.id === itemId);
      if (mc) {
        targetLead = this.data.leads.find(l => l.id === mc.leadId) || {
          id: mc.id,
          name: mc.name,
          phone: mc.phone,
          preferredProduct: mc.product,
          crossSell: 'Extended Warranty + Stabilizer',
          emi: '6m No-Cost EMI available',
          story: mc.note,
          score: mc.score,
          value: mc.value || 15000
        };
        // Remove from missed calls queue when called back
        this.data.missedCalls = this.data.missedCalls.filter(m => m.id !== itemId);
        this.saveData();
      }
    } else if (sourceType === 'recent') {
      const rc = this.data.recentCalls.find(r => r.id === itemId);
      if (rc) {
        targetLead = this.data.leads.find(l => l.id === rc.leadId) || {
          id: rc.id,
          name: rc.name,
          phone: rc.phone,
          preferredProduct: rc.product,
          crossSell: '2yr Extended Warranty',
          emi: 'No-Cost EMI split',
          story: 'Follow-up from recent call log.'
        };
      }
    }

    if (!targetLead) {
      targetLead = this.data.leads[0];
    }

    this.navigate('active-call');
    window.OGCalling.startCall(targetLead, { mode: window.OGCalling.mode });
  },

  startPracticeCallBanner() {
    const lead = this.data.leads[0]; // Mukunda Rao
    this.triggerIncomingBanner(lead, 'ai', true);
  },

  triggerIncomingBanner(leadInfo, callMode = 'ai', isPractice = false) {
    const lead = window.OGCalling.normalizeLead(leadInfo);
    this.pendingIncomingLead = { lead, callMode, isPractice };
    const banner = document.getElementById('incomingCallBanner');
    const titleEl = document.getElementById('incCallerTitle');
    const subEl = document.getElementById('incCallerSub');

    if (titleEl) {
      titleEl.textContent = `${isPractice ? '[Practice Simulation] ' : ''}Incoming Call · ${lead.name} (${lead.phone})`;
    }
    if (subEl) {
      subEl.textContent = `${lead.preferredProduct} · Mode: ${callMode === 'webrtc' ? 'Human-to-Human WebRTC' : 'AI Customer Voice'}`;
    }
    if (banner) {
      banner.classList.add('visible');
    }
    window.OGCalling.startRingbackTone(true);
  },

  acceptIncomingBannerCall() {
    const banner = document.getElementById('incomingCallBanner');
    if (banner) banner.classList.remove('visible');
    window.OGCalling.stopRingbackTone();

    const pending = this.pendingIncomingLead || { lead: this.data.leads[0], callMode: 'ai', isPractice: true };
    window.OGCalling.mode = pending.callMode;
    this.navigate('active-call');
    window.OGCalling.startCall(pending.lead, {
      mode: pending.callMode,
      direction: 'incoming',
      isPractice: pending.isPractice
    });
  },

  declineIncomingBannerCall() {
    const banner = document.getElementById('incomingCallBanner');
    if (banner) banner.classList.remove('visible');
    window.OGCalling.stopRingbackTone();
    this.toast('Incoming call declined');
  },

  /* ============================================================
     ACTIVE CALL + AI ASSIST SCREEN
     ============================================================ */
  renderActiveCallScreen(container) {
    const call = window.OGCalling.activeCall || {
      lead: this.data.leads[0],
      mode: window.OGCalling.mode,
      status: 'ringing',
      durationSeconds: 0,
      transcript: [],
      sopState: window.OGCalling.sopDefinitions.map(s => ({ id: s.id, name: s.name, hint: s.hint, passed: false })),
      sentiment: 'Neutral · Curious',
      liveSummary: ['Initializing voice bridge...']
    };
    const lead = call.lead;
    const passedCount = call.sopState.filter(s => s.passed).length;

    container.innerHTML = `
      <div class="active-call-container">
        <!-- Top Call Bar -->
        <div class="active-call-top">
          <div class="ac-caller-info">
            <div class="ac-avatar">${(lead.name || 'C').slice(0, 2).toUpperCase()}</div>
            <div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-size:15px; font-weight:700;">${lead.name}</span>
                <span style="font-size:12px; color:#cbd5e1;">${lead.phone}</span>
                <span class="ac-status-pill" id="acStatusBadge">
                  ${call.status === 'connected' ? '🟢 Connected' : '📲 Ringing...'} · <span id="acTimerText">${window.OGCalling.formatDuration(call.durationSeconds)}</span>
                </span>
              </div>
              <div style="font-size:11.5px; color:#a7f3d0; margin-top:2px;">
                ${lead.preferredProduct} · Mode: <strong>${call.mode === 'webrtc' ? 'Human-to-Human Live WebRTC' : (call.mode === 'tel' ? 'Cellular / System Dialer Bridge' : 'AI-to-Human Live Voice')}</strong>
              </div>
            </div>
            <!-- 16-bar Live Audio Visualizer -->
            <div class="mic-visualizer" id="micVisualizer" title="Live Microphone Audio Spectrum">
              ${Array.from({ length: 16 }).map(() => `<div class="viz-bar"></div>`).join('')}
            </div>
          </div>

          <div class="ac-controls">
            <button class="ac-ctrl-btn" id="btnToggleMute" onclick="OGApp.handleMuteToggle()">🎙️ Mic On</button>
            <button class="ac-ctrl-btn" id="btnToggleHold" onclick="OGApp.handleHoldToggle()">⏸ Hold</button>
            <button class="ac-ctrl-btn" id="btnToggleSpeaker" onclick="OGApp.handleSpeakerToggle()">🔊 Speaker On</button>
            <button class="ac-ctrl-btn" onclick="OGCalling.openCompanionPhone()">👥 Companion Phone</button>
            <button class="ac-hangup-btn" onclick="OGCalling.endCall()">✕ End Call & Wrap Up</button>
          </div>
        </div>

        <!-- Side-by-Side Split: Left Live Transcript + Right AI Assist -->
        <div class="ac-split-grid">
          <!-- Left Column: Live Transcript -->
          <div class="transcript-panel">
            <div class="call-list-header" style="background:#fff;">
              <div>
                <span class="card-title">🎙️ Live Transcript</span>
                <span id="micListeningBadge" style="font-size:11px; color:#16a34a; margin-left:8px; font-weight:600;">● Listening to your mic (or click a Quick-Say SOP chip below)</span>
              </div>
            </div>

            <div class="transcript-feed" id="liveTranscriptFeed">
              ${call.transcript.length === 0 ? `
                <div class="tr-bubble system">
                  Dialing ${lead.name} (${lead.phone})... Speak into your microphone or click any SOP Quick-Say chip below once connected!
                </div>
              ` : call.transcript.map(t => this.renderTranscriptBubbleHTML(t)).join('')}
            </div>

            <div id="interimSpeechBox" style="display:none; padding:6px 14px; background:#ecfdf5; color:#065f46; font-size:11.5px; font-style:italic; border-top:1px solid #a7f3d0;"></div>

            <!-- 6 SOP Quick-Say Chips (Speak & test SOP steps with 1 click!) -->
            <div class="sop-quick-chips">
              ${window.OGCalling.sopDefinitions.map((def, i) => `
                <button class="sop-chip-btn" onclick="OGApp.triggerQuickSay('${def.id}')">
                  ${i + 1}. ${def.name.split(' ')[0]}
                </button>
              `).join('')}
            </div>

            <div class="tr-composer">
              <input type="text" id="agentSpeechInput" placeholder="Speak into your microphone OR type what you say to ${lead.name}..." onkeydown="if(event.key==='Enter') OGApp.sendAgentTypedLine()" />
              <button class="btn-primary-call" onclick="OGApp.sendAgentTypedLine()">Speak / Send</button>
            </div>
          </div>

          <!-- Right Column: AI Assist Panel -->
          <div class="ai-assist-panel" id="aiAssistPanel">
            ${this.getAIAssistInnerHTML(call)}
          </div>
        </div>
      </div>
    `;
  },

  renderTranscriptBubbleHTML(entry) {
    return `
      <div class="tr-bubble ${entry.speaker}">
        <div class="tr-meta">
          <span>${entry.speakerName}</span>
          <span>${entry.time}</span>
        </div>
        <div>${entry.text}</div>
      </div>
    `;
  },

  getAIAssistInnerHTML(call) {
    const lead = call.lead;
    const passedCount = call.sopState.filter(s => s.passed).length;

    return `
      <!-- Gamified Unlock Strip -->
      <div class="gamified-strip">
        <span>✨ AI Assist Copilot · Live SOP Score: <strong style="color:#4ade80;">${passedCount}/6</strong></span>
        <span>${passedCount >= 5 ? '🏆 SOP Pro Badge Unlocked (+25 XP)!' : `${5 - passedCount} more steps to unlock SOP Pro (+25 XP)`}</span>
      </div>

      <!-- Off-SOP Drift Warning Nudge -->
      ${call.driftWarning ? `
        <div class="drift-nudge-banner">
          <div style="font-weight:700; display:flex; justify-content:space-between; align-items:center;">
            <span>⚠️ Drifting off SOP — Next: ${call.driftWarning.stepName}</span>
            <button class="sop-chip-btn" onclick="OGCalling.handleAgentUtterance(${JSON.stringify(call.driftWarning.suggestion).replace(/"/g, '&quot;')}, 'nudge')">Say This Now →</button>
          </div>
          <div style="margin-top:4px; font-style:italic;">"${call.driftWarning.suggestion}"</div>
        </div>
      ` : ''}

      <!-- Main Objective & Product to Offer -->
      <div class="detail-grid-4" style="margin-bottom:0;">
        <div class="detail-item" style="background:#f0fdf4; border-color:#bbf7d0;">
          <div class="detail-lbl" style="color:#166534;">Main Objective & Product</div>
          <div class="detail-val" style="font-weight:700;">Close ${lead.preferredProduct}</div>
          <div style="font-size:11px; color:#15803d; margin-top:2px;">Cross-sell: ${lead.crossSell}</div>
        </div>
        <div class="detail-item" style="background:#eff6ff; border-color:#bfdbfe;">
          <div class="detail-lbl" style="color:#1e40af;">EMI & Sentiment</div>
          <div class="detail-val" style="font-weight:700;">${lead.emi}</div>
          <div style="font-size:11px; color:#1d4ed8; margin-top:2px;">Sentiment: <strong>${call.sentiment}</strong></div>
        </div>
      </div>

      <!-- Live 6-Step SOP Checklist -->
      <div>
        <div style="font-size:11.5px; font-weight:700; color:var(--text-main); margin-bottom:6px; display:flex; justify-content:space-between;">
          <span>Live SOP Checklist (Auto-ticks as you speak)</span>
          <span style="color:var(--text-muted); font-weight:500;">Click any item to speak script</span>
        </div>
        <div class="sop-live-list">
          ${call.sopState.map((s, idx) => `
            <div class="sop-live-item ${s.passed ? 'passed' : ''}" onclick="OGApp.triggerQuickSay('${s.id}')" style="cursor:pointer;">
              <div>
                <span>${s.passed ? '✅' : '⬜'} <strong>${idx + 1}. ${s.name}</strong></span>
                <div style="font-size:10.5px; color:var(--text-muted); margin-left:20px;">${s.passed && s.quote ? s.quote : s.hint}</div>
              </div>
              <span class="outcome-tag ${s.passed ? 'green' : 'gray'}">${s.passed ? 'Covered' : 'Say →'}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Ask AI Copilot Box -->
      <div class="detail-item">
        <div class="detail-lbl">Ask AI Copilot (Live Objection Helper)</div>
        <div style="display:flex; gap:6px; margin-top:5px;">
          <input type="text" id="askAiCopilotInput" placeholder="e.g., How to handle hard-water or online price objection?" style="flex:1; padding:6px 9px; border:1px solid var(--border-med); border-radius:6px; font-size:11.5px;" onkeydown="if(event.key==='Enter') OGApp.askLiveCopilot()" />
          <button class="btn-secondary-sm" onclick="OGApp.askLiveCopilot()">Ask AI</button>
        </div>
        <div id="askAiCopilotReply" style="font-size:11.5px; color:#4c1d95; margin-top:6px; display:none; background:#f3e8ff; padding:7px 9px; border-radius:6px;"></div>
      </div>

      <!-- Auto-Drafting Summary -->
      <div class="detail-item" style="background:#f8fafc;">
        <div class="detail-lbl">Summary — drafting live as you talk</div>
        <ul style="margin-top:5px; padding-left:16px; font-size:11.5px; color:var(--text-secondary);">
          ${(call.liveSummary || []).map(line => `<li>${line}</li>`).join('')}
        </ul>
      </div>
    `;
  },

  handleCallStateChange(call) {
    if (this.currentView === 'active-call') {
      const badge = document.getElementById('acStatusBadge');
      if (badge) {
        badge.innerHTML = `${call.status === 'connected' ? '🟢 Connected' : '📲 Ringing...'} · <span id="acTimerText">${window.OGCalling.formatDuration(call.durationSeconds)}</span>`;
      }
    }
  },

  updateActiveCallTimer(sec) {
    const el = document.getElementById('acTimerText');
    if (el) el.textContent = window.OGCalling.formatDuration(sec);
  },

  appendLiveTranscript(entry, call) {
    const feed = document.getElementById('liveTranscriptFeed');
    if (!feed) return;
    const div = document.createElement('div');
    div.innerHTML = this.renderTranscriptBubbleHTML(entry);
    feed.appendChild(div.firstElementChild);
    feed.scrollTop = feed.scrollHeight;
  },

  renderLiveSOPPanel(call) {
    const panel = document.getElementById('aiAssistPanel');
    if (panel) {
      panel.innerHTML = this.getAIAssistInnerHTML(call);
    }
  },

  updateInterimSpeech(text) {
    const box = document.getElementById('interimSpeechBox');
    if (!box) return;
    if (text) {
      box.style.display = 'block';
      box.textContent = `🎙️ Hearing: "${text}..."`;
    } else {
      box.style.display = 'none';
    }
  },

  updateVisualizerBars(freqData) {
    const container = document.getElementById('micVisualizer');
    if (!container) return;
    const bars = container.querySelectorAll('.viz-bar');
    bars.forEach((bar, i) => {
      const val = freqData[i] || 15;
      const h = Math.max(4, Math.min(22, Math.round((val / 255) * 22)));
      bar.style.height = h + 'px';
    });
  },

  triggerQuickSay(sopId) {
    const call = window.OGCalling.activeCall;
    if (!call) return;
    if (call.status === 'ringing') {
      window.OGCalling.onCallConnected();
    }
    const def = window.OGCalling.sopDefinitions.find(d => d.id === sopId);
    if (def) {
      const line = def.quickSay(call.lead);
      window.OGCalling.handleAgentUtterance(line, 'chip');
    }
  },

  sendAgentTypedLine() {
    const inp = document.getElementById('agentSpeechInput');
    if (!inp || !inp.value.trim()) return;
    const call = window.OGCalling.activeCall;
    if (call && call.status === 'ringing') {
      window.OGCalling.onCallConnected();
    }
    window.OGCalling.handleAgentUtterance(inp.value.trim(), 'typed');
    inp.value = '';
  },

  askLiveCopilot() {
    const inp = document.getElementById('askAiCopilotInput');
    const out = document.getElementById('askAiCopilotReply');
    if (!inp || !out) return;
    const q = inp.value.trim().toLowerCase();
    const lead = (window.OGCalling.activeCall && window.OGCalling.activeCall.lead) || this.data.leads[0];
    out.style.display = 'block';

    if (q.includes('water') || q.includes('scale') || q.includes('warranty')) {
      out.innerHTML = `<strong>Suggested Script:</strong> "Our 10-year motor warranty covers Indiranagar hard-water conditions, and we're bundling a free 6-pack Descaler kit worth ₹1,890 today."`;
    } else if (q.includes('price') || q.includes('online') || q.includes('expensive') || q.includes('discount')) {
      out.innerHTML = `<strong>Suggested Script:</strong> "With our ₹3,500 instant old-appliance exchange bonus and ${lead.emi}, your net effective price beats online listings AND includes 24h store installation."`;
    } else {
      out.innerHTML = `<strong>Suggested Script:</strong> "You can lock ${lead.preferredProduct} right now on ${lead.emi} with zero down-payment and priority tomorrow morning installation."`;
    }
  },

  handleMuteToggle() {
    const muted = window.OGCalling.toggleMute();
    const btn = document.getElementById('btnToggleMute');
    if (btn) {
      btn.textContent = muted ? '🔇 Mic Muted' : '🎙️ Mic On';
      btn.classList.toggle('active', muted);
    }
  },

  handleHoldToggle() {
    const held = window.OGCalling.toggleHold();
    const btn = document.getElementById('btnToggleHold');
    if (btn) {
      btn.textContent = held ? '▶ Resume' : '⏸ Hold';
      btn.classList.toggle('active', held);
    }
  },

  handleSpeakerToggle() {
    const spk = window.OGCalling.toggleSpeaker();
    const btn = document.getElementById('btnToggleSpeaker');
    if (btn) {
      btn.textContent = spk ? '🔊 Speaker On' : '🔈 Speaker Off';
      btn.classList.toggle('active', !spk);
    }
  },

  /* ============================================================
     POST-CALL WRAP-UP MODAL & SOP REVIEW MODAL
     ============================================================ */
  openCallWrapupModal(finishedCall) {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;

    const passed = finishedCall.sopState.filter(s => s.passed).length;
    const durationStr = window.OGCalling.formatDuration(Math.max(12, finishedCall.durationSeconds));

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="font-size:11px; text-transform:uppercase; color:#86efac; font-weight:700;">Call Wrap-Up & CRM Sync</div>
        <div style="font-size:16px; font-weight:700; margin-top:2px;">${finishedCall.lead.name} · ${durationStr} · SOP Score: ${passed}/6</div>
      </div>
      <div class="modal-body-scroll">
        <div class="detail-grid-4" style="margin-bottom:0;">
          <div class="detail-item">
            <div class="detail-lbl">Select Call Outcome</div>
            <select id="wrapupOutcomeSelect" style="width:100%; margin-top:5px; padding:7px; border-radius:6px; border:1px solid var(--border-med);">
              <option value="Converted|green">Converted (Order Locked ✓)</option>
              <option value="Callback set|amber" selected>Callback set (4:30 PM / Tomorrow)</option>
              <option value="Quote sent|blue">Quote sent on WhatsApp</option>
              <option value="Follow-up|amber">Follow-up required</option>
            </select>
          </div>
          <div class="detail-item">
            <div class="detail-lbl">SOP Adherence Earned</div>
            <div class="detail-val" style="color:#16a34a; font-weight:700;">${passed}/6 Checkpoints (${passed >= 5 ? '+2 OG Score pts' : 'Standard'})</div>
          </div>
        </div>

        <div class="detail-item">
          <div class="detail-lbl">AI-Drafted Call Summary (Editable)</div>
          <textarea id="wrapupSummaryText" rows="3" style="width:100%; margin-top:6px; padding:8px; border:1px solid var(--border-med); border-radius:6px;">${(finishedCall.liveSummary || []).join(' ')}</textarea>
        </div>
      </div>
      <div class="modal-footer-bar">
        <button class="btn-secondary-sm" onclick="OGApp.closeModal('genericModal'); OGApp.navigate('plan-recent');">Skip</button>
        <button class="btn-primary-call" onclick="OGApp.saveCallWrapup()">✓ Save to CRM & Recent Calls</button>
      </div>
    `;

    this._lastFinishedCall = finishedCall;
    modal.classList.add('open');
  },

  saveCallWrapup() {
    const fc = this._lastFinishedCall;
    if (!fc) return;
    const sel = document.getElementById('wrapupOutcomeSelect');
    const [outcome, outcomeTone] = sel ? sel.value.split('|') : ['Callback set', 'amber'];
    const passed = fc.sopState.filter(s => s.passed).length;
    const durationStr = window.OGCalling.formatDuration(Math.max(18, fc.durationSeconds));

    const newRecent = {
      id: 'rc-' + Date.now(),
      leadId: fc.lead.id,
      name: fc.lead.name,
      phone: fc.lead.phone,
      direction: fc.direction || 'outgoing',
      time: 'Just now',
      duration: durationStr,
      outcome,
      outcomeTone,
      product: fc.lead.preferredProduct,
      sopScore: `${passed}/6`,
      sopItems: fc.sopState.map(s => ({
        name: s.name,
        passed: s.passed,
        quote: s.passed ? (s.quote || '"Covered during live voice call."') : 'Not detected during call.'
      }))
    };

    this.data.recentCalls.unshift(newRecent);
    this.data.kpiRanges.today.leadsCalled += 1;
    if (passed >= 5 && this.data.agent.ogScore < 99) {
      this.data.agent.ogScore += 1;
      this.data.kpiRanges.today.ogScore = this.data.agent.ogScore;
    }
    if (outcome === 'Converted') {
      this.data.agent.earnings.current += 400;
    }

    this.saveData();
    this.closeModal('genericModal');
    this.toast(`Saved call with ${fc.lead.name} (${passed}/6 SOP) to Recent Calls!`);
    this.navigate('plan-recent');
  },

  openSopReviewModal(recentId) {
    const rc = this.data.recentCalls.find(r => r.id === recentId) || this.data.recentCalls[0];
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet || !rc) return;

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:#d8b4fe; font-weight:700;">AI Call SOP Audit · ${rc.time}</div>
            <div style="font-size:16px; font-weight:700; margin-top:2px;">${rc.name} · SOP Score: ${rc.sopScore} (${rc.duration})</div>
          </div>
          <button class="ac-ctrl-btn" onclick="OGApp.closeModal('genericModal')">✕</button>
        </div>
      </div>
      <div class="modal-body-scroll">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-subtle); border-radius:8px;">
          <span>Product: <strong>${rc.product}</strong></span>
          <span class="outcome-tag ${rc.outcomeTone}">${rc.outcome}</span>
        </div>

        <div class="sop-live-list">
          ${(rc.sopItems || []).map((item, idx) => `
            <div class="sop-live-item ${item.passed ? 'passed' : ''}" style="flex-direction:column; align-items:flex-start; gap:4px;">
              <div style="display:flex; justify-content:space-between; width:100%;">
                <span>${item.passed ? '✅' : '❌'} <strong>${idx + 1}. ${item.name}</strong></span>
                <span class="outcome-tag ${item.passed ? 'green' : 'red'}">${item.passed ? 'Passed' : 'Missed'}</span>
              </div>
              <div style="font-size:11px; color:var(--text-secondary); font-style:italic; padding-left:20px;">${item.quote}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer-bar">
        <button class="btn-secondary-sm" onclick="OGApp.closeModal('genericModal')">Close</button>
        <button class="btn-primary-call" onclick="OGApp.closeModal('genericModal'); OGApp.initiateCallFlow('${rc.id}', 'recent');">📞 Call ${rc.name} Again</button>
      </div>
    `;
    modal.classList.add('open');
  },

  /* ============================================================
     SCREEN 3: CALENDAR
     ============================================================ */
  renderCalendar(container) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    const firstDayIndex = new Date(this.calYear, this.calMonth, 1).getDay();
    const events = this.data.calendarEvents || [];

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(`<div class="cal-cell" style="opacity:0.25; pointer-events:none;"></div>`);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = events.filter(e => e.day === day && e.month === this.calMonth);
      const isToday = day === 3 && this.calMonth === 10;
      const isSel = day === this.calSelectedDay;
      cells.push(`
        <div class="cal-cell ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}" onclick="OGApp.selectCalendarDay(${day})">
          <span>${day} ${isToday ? '<small style="font-size:9px;">(Today)</small>' : ''}</span>
          <div class="cal-dots">
            ${dayEvents.map(() => `<span class="cal-dot"></span>`).join('')}
          </div>
        </div>
      `);
    }

    container.innerHTML = `
      <div class="section-banner">
        <div>
          <div class="section-banner-title">Calendar & Callback Schedule</div>
          <div class="section-banner-sub">Synced with avani@onground.ai · Google Workspace & On-Ground Voice Bridge</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="cc-date-btn" onclick="OGApp.jumpCalendarToday()">Today (Nov 3)</button>
          <button class="btn-primary-call" onclick="OGApp.openNewEventModal()">+ New Event</button>
        </div>
      </div>

      <div class="cal-grid-layout">
        <!-- Month Grid -->
        <div class="surface-card">
          <div class="card-head">
            <span class="card-title" style="font-size:14px;">${monthNames[this.calMonth]} ${this.calYear}</span>
            <div style="display:flex; gap:6px;">
              <button class="btn-secondary-sm" onclick="OGApp.changeCalMonth(-1)">‹ Prev</button>
              <button class="btn-secondary-sm" onclick="OGApp.changeCalMonth(1)">Next ›</button>
            </div>
          </div>
          <div class="cal-days-header">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="cal-day-name">${d}</div>`).join('')}
          </div>
          <div class="cal-month-grid">
            ${cells.join('')}
          </div>
        </div>

        <!-- Upcoming Invites List -->
        <div class="surface-card">
          <div class="card-head">
            <span class="card-title">Upcoming callbacks & huddles (${events.length})</span>
            <span style="font-size:11px; color:var(--text-muted);">Nov ${this.calSelectedDay} highlighted</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${events.map(ev => `
              <div class="detail-item" style="${ev.day === this.calSelectedDay ? 'border-color:#16a34a; background:#f0fdf4;' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span class="outcome-tag ${ev.type === 'callback' ? 'green' : 'blue'}">Nov ${ev.day} · ${ev.time}</span>
                  <button class="btn-secondary-sm" style="padding:3px 8px; font-size:10.5px;" onclick="OGApp.shareCalendarInvite('${ev.id}')">Share invite</button>
                </div>
                <div style="font-size:12.5px; font-weight:700; margin-top:5px;">${ev.title}</div>
                <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">👥 ${ev.attendees} · 📍 ${ev.location}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  selectCalendarDay(day) {
    this.calSelectedDay = day;
    this.renderCalendar(document.getElementById('workspaceContent'));
  },

  changeCalMonth(delta) {
    this.calMonth += delta;
    if (this.calMonth < 0) { this.calMonth = 11; this.calYear--; }
    if (this.calMonth > 11) { this.calMonth = 0; this.calYear++; }
    this.renderCalendar(document.getElementById('workspaceContent'));
  },

  jumpCalendarToday() {
    this.calMonth = 10;
    this.calYear = 2026;
    this.calSelectedDay = 3;
    this.renderCalendar(document.getElementById('workspaceContent'));
  },

  shareCalendarInvite(evId) {
    const ev = this.data.calendarEvents.find(e => e.id === evId);
    if (!ev) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${ev.title} (${ev.time}) - ${ev.location}`).catch(() => {});
    }
    this.toast(`Invite link copied & shared for: ${ev.title}`);
  },

  openNewEventModal() {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="font-size:15px; font-weight:700;">Schedule Callback / Calendar Event</div>
      </div>
      <div class="modal-body-scroll">
        <div class="detail-item">
          <div class="detail-lbl">Event Title</div>
          <input id="newEvTitle" type="text" value="Callback — Faizan A. (Samsung 253L Fridge)" style="width:100%; margin-top:5px; padding:7px; border:1px solid var(--border-med); border-radius:6px;" />
        </div>
        <div class="detail-grid-4" style="margin-bottom:0;">
          <div class="detail-item">
            <div class="detail-lbl">Day (Nov 2026)</div>
            <input id="newEvDay" type="number" min="1" max="30" value="${this.calSelectedDay}" style="width:100%; margin-top:5px; padding:7px; border:1px solid var(--border-med); border-radius:6px;" />
          </div>
          <div class="detail-item">
            <div class="detail-lbl">Time Slot</div>
            <input id="newEvTime" type="text" value="5:15 PM – 5:30 PM" style="width:100%; margin-top:5px; padding:7px; border:1px solid var(--border-med); border-radius:6px;" />
          </div>
        </div>
      </div>
      <div class="modal-footer-bar">
        <button class="btn-secondary-sm" onclick="OGApp.closeModal('genericModal')">Cancel</button>
        <button class="btn-primary-call" onclick="OGApp.saveNewCalendarEvent()">Save Event</button>
      </div>
    `;
    modal.classList.add('open');
  },

  saveNewCalendarEvent() {
    const title = document.getElementById('newEvTitle').value || 'Customer Callback';
    const day = parseInt(document.getElementById('newEvDay').value, 10) || 3;
    const time = document.getElementById('newEvTime').value || '5:00 PM';

    this.data.calendarEvents.unshift({
      id: 'ev-' + Date.now(),
      day,
      month: 10,
      year: 2026,
      title,
      time,
      type: 'callback',
      attendees: 'Avani, Customer',
      location: 'On-Ground Voice Bridge'
    });
    this.saveData();
    this.closeModal('genericModal');
    this.renderCalendar(document.getElementById('workspaceContent'));
    this.toast(`Added "${title}" to Calendar!`);
  },

  /* ============================================================
     SCREEN 4A: PULSE HOME (Slack-style AI + Team Hub)
     ============================================================ */
  renderPulseHome(container) {
    const channels = Object.values(this.data.pulseChannels);
    const roleLeaders = channels.filter(c => c.category === 'role-leader');
    const roleAgents = channels.filter(c => c.category === 'role-agent');
    const taskAgents = channels.filter(c => c.category === 'task-agent');
    const stdChannels = channels.filter(c => c.category === 'channel');
    const dms = channels.filter(c => c.category === 'dm');

    container.innerHTML = `
      <div class="pulse-hero-header">
        <div>
          <div style="font-size:16px; font-weight:700;">Pulse · AI Agents & Team Channels</div>
          <div style="font-size:11.5px; color:#ddd6fe;">Bengaluru South Hub · Role Agents, Task Agents & Store Channels</div>
        </div>
        <div style="display:flex; gap:8px;">
          <input type="text" placeholder="Search channels, leads, or ask AvaniBot..." style="padding:6px 11px; border-radius:8px; border:1px solid rgba(255,255,255,0.25); background:rgba(255,255,255,0.12); color:#fff; width:240px;" onkeydown="if(event.key==='Enter') OGApp.openAvaniBotModal(this.value)" />
        </div>
      </div>

      <!-- AvaniBot Hero Card -->
      <div class="avanibot-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:14px; font-weight:700;">🤖 AvaniBot</span>
              <span class="nav-badge green">ALWAYS ON</span>
            </div>
            <div style="font-size:11.5px; color:#e9d5ff; margin-top:3px;">Your personal AI sales & SOP intelligence across all 5 active leads and store inventory.</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="cc-date-btn" onclick="OGApp.openAvaniBotModal('Daily Brief')">📋 Daily Brief</button>
            <button class="cc-date-btn" onclick="OGApp.openAvaniBotModal('Ask a question')">💬 Ask a question</button>
          </div>
        </div>
      </div>

      <!-- Custom Agents Fold -->
      <div class="surface-card" style="margin-bottom:12px; padding:10px 14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="OGApp.toggleCustomAgents()">
          <span style="font-size:12.5px; font-weight:700;">⚡ Custom Agents (2 active · EMI Rescue Bot, Kannada/Hindi Pitch Helper)</span>
          <span style="font-size:12px; color:var(--og-purple-600); font-weight:600;">${this.customAgentsOpen ? 'Hide ▲' : 'Configure ▼'}</span>
        </div>
        ${this.customAgentsOpen ? `
          <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border-light); display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div class="detail-item">
              <div class="detail-lbl">EMI Rescue Bot</div>
              <div class="detail-val">Auto-sends Bajaj/HDFC 0% EMI breakdown when a customer hesitates on lump-sum price.</div>
            </div>
            <div class="detail-item">
              <div class="detail-lbl">Vernacular Pitch Helper</div>
              <div class="detail-val">Provides instant Kannada & Hindi warranty reassurance phrases during live calls.</div>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Kudos Hero Card -->
      <div class="kudos-hero-card" onclick="OGApp.openKudosModal()">
        <div>
          <div style="font-size:13px; font-weight:700; color:#92400e;">🏆 Kudos & Recognition · <span style="background:#f59e0b; color:#fff; padding:1px 7px; border-radius:999px; font-size:10px;">${this.data.kudosList.length} NEW</span></div>
          <div style="font-size:11.5px; color:#b45309; margin-top:2px;">Sunita Rao awarded you "⭐ CSAT Champion" (94% CSAT today) · Tap to view or give Kudos</div>
        </div>
        <span style="font-weight:700; color:#b45309;">View →</span>
      </div>

      <div class="dash-mid-grid">
        <div class="dash-col" style="gap:4px;">
          <div class="pulse-section-label">Role Agent Leadership</div>
          ${roleLeaders.map(c => this.renderPulseRowHTML(c)).join('')}

          <div class="pulse-section-label">Role Agents</div>
          ${roleAgents.map(c => this.renderPulseRowHTML(c)).join('')}

          <div class="pulse-section-label">Task Agents</div>
          ${taskAgents.map(c => this.renderPulseRowHTML(c)).join('')}

          <div class="pulse-section-label">General · Customer Proxy</div>
          <div class="pulse-row-item" onclick="OGApp.openCustomerDiscussionsModal()">
            <div>
              <div style="font-weight:700; color:#15803d;">💬 #customer-discussions (WhatsApp Business & Voice Proxy)</div>
              <div style="font-size:11px; color:var(--text-muted);">3 active customer threads · Mukunda, Ritu S., Faizan A.</div>
            </div>
            <span class="nav-badge green">LIVE</span>
          </div>
        </div>

        <div class="dash-col" style="gap:4px;">
          <div class="pulse-section-label">Channels</div>
          ${stdChannels.map(c => this.renderPulseRowHTML(c)).join('')}

          <div class="pulse-section-label">Direct Messages</div>
          ${dms.map(c => this.renderPulseRowHTML(c)).join('')}
        </div>
      </div>
    `;
  },

  renderPulseRowHTML(ch) {
    const hasPendingPin = ch.pin && !ch.pin.resolved && ch.pin.taskId;
    return `
      <div class="pulse-row-item" onclick="OGApp.navigate('pulse-channel', { channelId: '${ch.id}' })">
        <div>
          <div style="font-weight:600; font-size:12.5px; display:flex; align-items:center; gap:6px;">
            <span>${ch.category === 'dm' ? '🟢 ' + ch.name : ch.name}</span>
            ${hasPendingPin ? `<span class="outcome-tag amber" style="font-size:10px;">📌 Needs input</span>` : ''}
          </div>
          <div style="font-size:11px; color:var(--text-muted);">${ch.subtitle}</div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          ${ch.unread > 0 ? `<span class="nav-badge">${ch.unread}</span>` : ''}
          <span style="color:var(--text-muted);">›</span>
        </div>
      </div>
    `;
  },

  toggleCustomAgents() {
    this.customAgentsOpen = !this.customAgentsOpen;
    this.renderPulseHome(document.getElementById('workspaceContent'));
  },

  /* ============================================================
     SCREEN 4B: PULSE CHANNEL CHAT VIEW (WITH PINNED "NEEDS YOUR INPUT" CARD)
     ============================================================ */
  renderPulseChannel(container, channelId) {
    const ch = this.data.pulseChannels[channelId] || this.data.pulseChannels['callcentre-team'];
    ch.unread = 0;
    this.saveData();

    container.innerHTML = `
      <div class="channel-chat-shell">
        <div class="channel-top-bar">
          <div style="display:flex; align-items:center; gap:10px;">
            <button class="cc-date-btn" onclick="OGApp.navigate('pulse-home')">← Pulse</button>
            <div>
              <div style="font-size:14px; font-weight:700;">${ch.name}</div>
              <div style="font-size:11px; color:#ddd6fe;">${ch.subtitle}</div>
            </div>
          </div>
          <button class="cc-date-btn" onclick="OGApp.openAvaniBotModal('Summarize ${ch.name}')">🤖 Ask AvaniBot</button>
        </div>

        ${ch.kpis ? `
          <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; padding:10px 16px; background:#f3e8ff; border-bottom:1px solid #d8b4fe;">
            ${ch.kpis.map(k => `
              <div style="background:#fff; padding:7px 10px; border-radius:8px; border:1px solid #e9d5ff;">
                <div style="font-size:10px; color:#6b21a8; font-weight:700; text-transform:uppercase;">${k.label}</div>
                <div style="font-size:15px; font-weight:800; color:#3b0764;">${k.value} <span style="font-size:10.5px; font-weight:500; color:#16a34a;">${k.delta}</span></div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${ch.pin ? `
          <div class="hcpin-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
              <div>
                <span class="hcpin-badge">${ch.pin.resolved ? '✓ Answered' : '📌 Needs your input'}</span>
                <div style="font-size:13px; font-weight:700; color:#78350f;">${ch.pin.title}</div>
                <div style="font-size:11.5px; color:#92400e; margin-top:2px;">${ch.pin.description}</div>
              </div>
              ${ch.pin.resolved ? `
                <span class="outcome-tag green">Resolved: "${ch.pin.resolutionText}"</span>
              ` : `
                <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                  <button class="btn-primary-call" onclick="OGApp.resolveChannelPin('${ch.id}', '${ch.pin.primaryBtn}')">✓ ${ch.pin.primaryBtn}</button>
                  <button class="btn-secondary-sm" onclick="OGApp.resolveChannelPin('${ch.id}', '${ch.pin.secondaryBtn}')">${ch.pin.secondaryBtn}</button>
                </div>
              `}
            </div>
            ${!ch.pin.resolved ? `
              <div style="display:flex; gap:6px; margin-top:8px;">
                <input type="text" id="pinCustomReplyInput" placeholder="Or type your own answer to resolve this pinned task..." style="flex:1; padding:6px 10px; border-radius:7px; border:1px solid #f59e0b; font-size:11.5px;" onkeydown="if(event.key==='Enter') OGApp.resolveChannelPinCustom('${ch.id}')" />
                <button class="btn-secondary-sm" onclick="OGApp.resolveChannelPinCustom('${ch.id}')">Reply & Resolve</button>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="chat-messages-area" id="channelMessagesArea">
          ${ch.messages.map(m => `
            <div class="chat-msg-card ${m.isMe ? 'me' : ''}">
              <div style="display:flex; justify-content:space-between; gap:10px; font-size:11px; margin-bottom:4px;">
                <strong style="color:${m.isMe ? '#5b21b6' : '#0f172a'};">${m.sender} <span style="font-weight:500; color:var(--text-muted);">· ${m.role || ''}</span></strong>
                <span style="color:var(--text-muted);">${m.time}</span>
              </div>
              ${m.structured ? `
                <div class="structured-box">
                  <div><strong>STAKEHOLDERS:</strong> ${m.structured.stakeholders}</div>
                  <div style="margin-top:3px;"><strong>ISSUE DEFINITION:</strong> ${m.structured.issue}</div>
                  <div style="margin-top:3px;"><strong>SUGGESTED RESOLUTION:</strong> ${m.structured.resolution}</div>
                </div>
              ` : ''}
              <div style="font-size:12.5px; line-height:1.45;">${m.text}</div>
            </div>
          `).join('')}
        </div>

        <div class="chat-composer-bar">
          <div style="display:flex; gap:4px;">
            ${['👍', '🔥', '✅', '🎯'].map(em => `
              <button class="btn-secondary-sm" style="padding:5px 7px;" onclick="OGApp.appendEmojiToComposer('${em}')">${em}</button>
            `).join('')}
          </div>
          <input type="text" id="channelMsgInput" placeholder="Message ${ch.name}..." onkeydown="if(event.key==='Enter') OGApp.sendChannelMessage('${ch.id}')" />
          <button class="btn-primary-call" onclick="OGApp.sendChannelMessage('${ch.id}')">Send →</button>
        </div>
      </div>
    `;

    const msgArea = document.getElementById('channelMessagesArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;
  },

  appendEmojiToComposer(emoji) {
    const inp = document.getElementById('channelMsgInput');
    if (inp) {
      inp.value += emoji + ' ';
      inp.focus();
    }
  },

  sendChannelMessage(channelId, customText = null) {
    const ch = this.data.pulseChannels[channelId];
    if (!ch) return;
    const inp = document.getElementById('channelMsgInput');
    const text = customText !== null ? customText : (inp ? inp.value.trim() : '');
    if (!text) return;

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    ch.messages.push({
      id: 'm-' + Date.now(),
      sender: 'Avani (You)',
      role: 'Senior Call Specialist',
      initials: 'AS',
      time: nowStr,
      isMe: true,
      text
    });

    if (inp && customText === null) inp.value = '';
    this.saveData();
    this.renderPulseChannel(document.getElementById('workspaceContent'), channelId);
  },

  resolveChannelPin(channelId, chosenAnswer) {
    const ch = this.data.pulseChannels[channelId];
    if (!ch || !ch.pin) return;
    ch.pin.resolved = true;
    ch.pin.resolutionText = chosenAnswer;

    // Also mark corresponding Dashboard task completed!
    if (ch.pin.taskId) {
      const task = this.data.tasks.find(t => t.id === ch.pin.taskId);
      if (task) task.completed = true;
    }

    this.sendChannelMessage(channelId, `✅ Resolved pinned card ("${ch.pin.title}"): ${chosenAnswer}`);
    this.toast(`Answered "${ch.pin.title}" — Dashboard task marked complete!`);
  },

  resolveChannelPinCustom(channelId) {
    const inp = document.getElementById('pinCustomReplyInput');
    if (!inp || !inp.value.trim()) return;
    this.resolveChannelPin(channelId, inp.value.trim());
  },

  /* ============================================================
     SCREEN 5: LEADS MODAL WITH PAGING (Lead 1 of 5 .. Lead 5 of 5)
     ============================================================ */
  openLeadsModal(index = 0) {
    const leads = this.data.leads;
    if (index < 0) index = leads.length - 1;
    if (index >= leads.length) index = 0;
    this.activeLeadIndex = index;

    const lead = leads[index];
    const modal = document.getElementById('leadsModal');
    const sheet = document.getElementById('leadsModalSheet');
    if (!modal || !sheet || !lead) return;

    const statusTone = lead.status === 'OPEN' ? 'green' : (lead.status === 'AGEING' ? 'amber' : 'gray');

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:#e9d5ff; font-weight:700;">
              Leads · Lead ${index + 1} of ${leads.length} · SLA to close: ${lead.sla}
            </div>
            <div style="font-size:16px; font-weight:700; margin-top:2px; display:flex; align-items:center; gap:8px;">
              <span>${lead.name}</span>
              <span class="outcome-tag ${statusTone}">${lead.status}</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button class="ac-ctrl-btn" onclick="OGApp.openLeadsModal(${index - 1})">‹ Prev</button>
            <div style="display:flex; gap:4px; padding:0 4px;">
              ${leads.map((_, i) => `
                <span onclick="OGApp.openLeadsModal(${i})" style="width:8px; height:8px; border-radius:50%; background:${i === index ? '#4ade80' : 'rgba(255,255,255,0.35)'}; cursor:pointer;"></span>
              `).join('')}
            </div>
            <button class="ac-ctrl-btn" onclick="OGApp.openLeadsModal(${index + 1})">Next ›</button>
            <button class="ac-ctrl-btn" onclick="OGApp.closeModal('leadsModal')">✕</button>
          </div>
        </div>
      </div>

      <div class="modal-body-scroll">
        <!-- Customer Summary & Quote Toggle -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding:10px 12px; background:var(--bg-subtle); border:1px solid var(--border-light); border-radius:10px;">
          <div>
            <div style="font-weight:700; font-size:13px;">${lead.fullName} · ${lead.phone}</div>
            <div style="font-size:11.5px; color:var(--text-secondary);">${lead.location} · ${lead.preferredProduct} (₹${lead.value.toLocaleString('en-IN')})</div>
          </div>
          <label style="display:flex; align-items:center; gap:7px; font-size:11.5px; font-weight:600; cursor:pointer;">
            <input type="checkbox" ${lead.quoteNeeded ? 'checked' : ''} onchange="OGApp.toggleLeadQuote('${lead.id}', this.checked)" />
            <span>Quote to be given to customer</span>
          </label>
        </div>

        <!-- ICP Score Bar & Lead Intent Score -->
        <div class="detail-grid-4" style="margin-bottom:0;">
          <div class="detail-item">
            <div style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:700;">
              <span>ICP Fit Score</span>
              <span style="color:#16a34a;">${lead.icpScore}%</span>
            </div>
            <div class="earnings-bar-track" style="margin:6px 0 4px;">
              <div class="earnings-bar-fill" style="width:${lead.icpScore}%;"></div>
            </div>
            <button class="card-link" style="font-size:11px;" onclick="OGApp.toggleIcpBreakdown()">
              ${this.icpBreakdownOpen ? 'Hide ICP Fit Breakdown ▲' : 'View ICP Fit Breakdown ▼'}
            </button>
          </div>
          <div class="detail-item" style="display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div class="detail-lbl">Lead Intent Score</div>
              <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">Real-time store + WhatsApp signals</div>
            </div>
            <span class="score-pill high" style="font-size:16px; height:34px; padding:0 12px;">${lead.intentScore}</span>
          </div>
        </div>

        ${this.icpBreakdownOpen ? `
          <div class="detail-item" style="background:#f8fafc;">
            <div class="detail-lbl">ICP Fit Breakdown (Weighted)</div>
            <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
              ${(lead.icpBreakdown || []).map(b => `
                <div style="display:flex; justify-content:space-between; font-size:11.5px; border-bottom:1px dashed var(--border-light); padding-bottom:4px;">
                  <span><strong>${b.factor}</strong> (${b.weight}): ${b.note}</span>
                  <strong style="color:#15803d;">${b.score}</strong>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- How we got here -->
        <div class="detail-item">
          <div class="detail-lbl">How we got here</div>
          <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
            ${(lead.journey || []).map(j => `
              <div style="font-size:11.5px; display:flex; gap:8px;">
                <span style="color:#16a34a; font-weight:700;">●</span>
                <span><strong>${j.time}:</strong> ${j.event}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Where we picked up signals (Buying Signals) -->
        <div class="detail-item">
          <div class="detail-lbl">Where we picked up signals</div>
          <div style="display:flex; flex-direction:column; gap:7px; margin-top:6px;">
            ${(lead.signals || []).map(sig => `
              <div style="padding:7px 9px; background:var(--bg-subtle); border:1px solid var(--border-light); border-radius:7px;">
                <div style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:700;">
                  <span>📡 ${sig.title}</span>
                  <span class="outcome-tag green">${sig.badge}</span>
                </div>
                <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">${sig.detail}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Before you reach out -->
        <div class="detail-item" style="background:#fffbeb; border-color:#fde68a;">
          <div class="detail-lbl" style="color:#92400e;">Before you reach out</div>
          <ul style="margin-top:5px; padding-left:16px; font-size:11.5px; color:#78350f;">
            ${(lead.beforeYouReachOut || []).map(n => `<li>${n}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="modal-footer-bar">
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn-secondary-sm" onclick="OGApp.markLeadAction('${lead.id}', 'No Interest')">No Interest</button>
          <button class="btn-secondary-sm" onclick="OGApp.closeModal('leadsModal'); OGApp.openCustomerDiscussionsModal('${lead.id}');">💬 WhatsApp</button>
          <button class="btn-primary-call" onclick="OGApp.closeModal('leadsModal'); OGApp.openPreCallChecklist('${lead.id}');">📞 On-ground Call</button>
          <button class="btn-secondary-sm" style="background:#dcfce7; border-color:#86efac; color:#166534;" onclick="OGApp.markLeadAction('${lead.id}', 'Came Back ✓')">Came Back ✓</button>
        </div>
        <span style="font-size:11px; font-weight:700; color:var(--og-red-600);">Cumulative Missed: ${this.data.missedCalls.length}</span>
      </div>
    `;

    modal.classList.add('open');
  },

  toggleIcpBreakdown() {
    this.icpBreakdownOpen = !this.icpBreakdownOpen;
    this.openLeadsModal(this.activeLeadIndex);
  },

  toggleLeadQuote(leadId, checked) {
    const lead = this.data.leads.find(l => l.id === leadId);
    if (lead) {
      lead.quoteNeeded = checked;
      this.saveData();
      this.toast(`Quote flag ${checked ? 'enabled' : 'disabled'} for ${lead.name}`);
    }
  },

  markLeadAction(leadId, actionLabel) {
    const lead = this.data.leads.find(l => l.id === leadId);
    if (!lead) return;
    if (actionLabel === 'Came Back ✓') {
      lead.status = 'OPEN';
      this.data.agent.earnings.current += 200;
    } else {
      lead.status = 'COLD';
    }
    this.saveData();
    this.closeModal('leadsModal');
    this.toast(`${lead.name} marked as "${actionLabel}"`);
    if (this.currentView === 'plan-outgoing') {
      this.renderPlanOutgoing(document.getElementById('workspaceContent'));
    }
  },

  /* ============================================================
     TOPBAR MODALS: NOTIFICATIONS, OG SCORE RADAR, LEADERBOARD, AVATAR, KEYPAD
     ============================================================ */
  openNotificationsModal() {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:15px; font-weight:700;">🔔 Notifications (${this.data.notifications.length})</div>
          <button class="ac-ctrl-btn" onclick="OGApp.markAllNotificationsRead()">Mark all read</button>
        </div>
      </div>
      <div class="modal-body-scroll">
        ${this.data.notifications.map(n => `
          <div class="detail-item" style="cursor:pointer; ${n.unread ? 'border-color:#86efac; background:#f0fdf4;' : ''}" onclick="OGApp.triggerNotificationAction('${n.id}')">
            <div style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:700;">
              <span>${n.unread ? '🟢 ' : ''}${n.title}</span>
              <span style="color:var(--text-muted);">${n.time}</span>
            </div>
            <div style="font-size:11.5px; color:var(--text-secondary); margin-top:3px;">${n.body}</div>
          </div>
        `).join('')}
      </div>
      <div class="modal-footer-bar">
        <button class="btn-secondary-sm" onclick="OGApp.closeModal('genericModal')">Close</button>
      </div>
    `;
    modal.classList.add('open');
  },

  markAllNotificationsRead() {
    this.data.notifications.forEach(n => { n.unread = false; });
    this.saveData();
    this.openNotificationsModal();
  },

  triggerNotificationAction(notifId) {
    const n = this.data.notifications.find(x => x.id === notifId);
    if (!n) return;
    n.unread = false;
    this.saveData();
    this.closeModal('genericModal');

    if (n.action === 'openIncoming') {
      this.navigate('plan-incoming');
    } else if (n.action && n.action.startsWith('openLead:')) {
      const lid = n.action.split(':')[1];
      const idx = this.data.leads.findIndex(l => l.id === lid);
      this.openLeadsModal(idx >= 0 ? idx : 0);
    } else if (n.action && n.action.startsWith('openChannel:')) {
      const cid = n.action.split(':')[1];
      this.navigate('pulse-channel', { channelId: cid });
    } else if (n.action === 'openKudos') {
      this.openKudosModal();
    }
  },

  openOgScoreModal() {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;
    const dims = this.data.agent.ogDimensions;

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:#86efac; font-weight:700;">Composite Performance Metric</div>
            <div style="font-size:16px; font-weight:700;">OG Score™ ${this.data.agent.ogScore} / 100 · 6-Dimension Radar</div>
          </div>
          <button class="ac-ctrl-btn" onclick="OGApp.closeModal('genericModal')">✕</button>
        </div>
      </div>
      <div class="modal-body-scroll">
        <div style="height:230px; position:relative;">
          <canvas id="ogRadarCanvas"></canvas>
        </div>
        <div class="detail-grid-4" style="margin-bottom:0;">
          ${Object.entries(dims).map(([k, v]) => `
            <div class="detail-item" style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:11.5px; font-weight:600;">${k}</span>
              <span class="score-pill ${v >= 75 ? 'high' : 'med'}">${v}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    modal.classList.add('open');

    if (typeof Chart !== 'undefined') {
      setTimeout(() => {
        const ctx = document.getElementById('ogRadarCanvas');
        if (!ctx) return;
        if (this.charts.radarChart) this.charts.radarChart.destroy();
        this.charts.radarChart = new Chart(ctx, {
          type: 'radar',
          data: {
            labels: Object.keys(dims),
            datasets: [{
              label: 'Avani (OG Score 76)',
              data: Object.values(dims),
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              borderColor: '#16a34a',
              pointBackgroundColor: '#15803d'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { min: 40, max: 100, ticks: { stepSize: 20 } } }
          }
        });
      }, 60);
    }
  },

  openLeaderboardModal() {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:15px; font-weight:700;">⭐ Bengaluru Hub Leaderboard (Rank #${this.data.agent.rank} of ${this.data.agent.totalAgents})</div>
          <button class="ac-ctrl-btn" onclick="OGApp.closeModal('genericModal')">✕</button>
        </div>
      </div>
      <div class="modal-body-scroll">
        ${this.data.agent.leaderboard.map(row => `
          <div class="detail-item" style="display:flex; justify-content:space-between; align-items:center; ${row.isMe ? 'background:#f0fdf4; border-color:#16a34a;' : ''}">
            <div>
              <div style="font-weight:700; font-size:13px;">#${row.rank} ${row.name}</div>
              <div style="font-size:11px; color:var(--text-secondary);">${row.hub} · ${row.calls} calls · CSAT ${row.csat}</div>
            </div>
            <span class="score-pill high">OG ${row.score}</span>
          </div>
        `).join('')}
      </div>
    `;
    modal.classList.add('open');
  },

  openSellingAvatarModal() {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;
    const archetypes = [
      { name: 'Consultant', desc: 'Educates on EMI splits, hard-water warranty & product fit (Your Default)' },
      { name: 'Closer', desc: 'High-urgency deal locking with same-day installation slots' },
      { name: 'Empathy Builder', desc: 'Warm discovery-first rapport for family appliance upgrades' }
    ];

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:15px; font-weight:700;">🎭 Selling Avatar Archetype</div>
          <button class="ac-ctrl-btn" onclick="OGApp.closeModal('genericModal')">✕</button>
        </div>
      </div>
      <div class="modal-body-scroll">
        ${archetypes.map(a => `
          <div class="detail-item" style="cursor:pointer; ${this.data.agent.sellingAvatar === a.name ? 'border-color:#7c3aed; background:#f3e8ff;' : ''}" onclick="OGApp.setSellingAvatar('${a.name}')">
            <div style="font-weight:700;">${a.name} ${this.data.agent.sellingAvatar === a.name ? '✓' : ''}</div>
            <div style="font-size:11.5px; color:var(--text-secondary); margin-top:2px;">${a.desc}</div>
          </div>
        `).join('')}
      </div>
    `;
    modal.classList.add('open');
  },

  setSellingAvatar(name) {
    this.data.agent.sellingAvatar = name;
    this.saveData();
    this.closeModal('genericModal');
    this.toast(`Selling Avatar updated to: ${name}`);
    if (this.currentView === 'dashboard') {
      this.renderDashboard(document.getElementById('workspaceContent'));
    }
  },

  openDateRangeModal() {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="font-size:15px; font-weight:700;">📅 Filter Dashboard Date Range</div>
      </div>
      <div class="modal-body-scroll">
        ${Object.entries(this.data.kpiRanges).map(([key, r]) => `
          <div class="detail-item" style="cursor:pointer; display:flex; justify-content:space-between; ${this.dateRangeKey === key ? 'border-color:#16a34a; background:#f0fdf4;' : ''}" onclick="OGApp.selectDateRange('${key}')">
            <strong>${r.label}</strong>
            <span>OG Score: ${r.ogScore} · CSAT: ${r.csat}</span>
          </div>
        `).join('')}
      </div>
    `;
    modal.classList.add('open');
  },

  selectDateRange(key) {
    this.dateRangeKey = key;
    this.closeModal('genericModal');
    this.renderDashboard(document.getElementById('workspaceContent'));
  },

  openEarningsModal() {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;
    const e = this.data.agent.earnings;

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:15px; font-weight:700;">💰 Monthly Incentive Breakdown (₹${e.current.toLocaleString('en-IN')})</div>
          <button class="ac-ctrl-btn" onclick="OGApp.closeModal('genericModal')">✕</button>
        </div>
      </div>
      <div class="modal-body-scroll">
        ${e.breakdown.map(b => `
          <div class="detail-item" style="display:flex; justify-content:space-between;">
            <span>${b.label}</span>
            <strong style="color:#15803d;">₹${b.amount.toLocaleString('en-IN')}</strong>
          </div>
        `).join('')}
      </div>
    `;
    modal.classList.add('open');
  },

  openKudosModal() {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:15px; font-weight:700;">🏆 Team Kudos & Recognition</div>
          <button class="ac-ctrl-btn" onclick="OGApp.closeModal('genericModal')">✕</button>
        </div>
      </div>
      <div class="modal-body-scroll">
        ${this.data.kudosList.map(k => `
          <div class="detail-item" style="background:#fffbeb; border-color:#fde68a;">
            <div style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:700; color:#92400e;">
              <span>${k.badge} · From ${k.from}</span>
              <span>${k.time}</span>
            </div>
            <div style="font-size:12px; color:#78350f; margin-top:4px;">"${k.text}"</div>
          </div>
        `).join('')}
      </div>
    `;
    modal.classList.add('open');
  },

  openAvaniBotModal(initialPrompt = 'Daily Brief') {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:15px; font-weight:700;">🤖 AvaniBot · AI Assistant</div>
          <button class="ac-ctrl-btn" onclick="OGApp.closeModal('genericModal')">✕</button>
        </div>
      </div>
      <div class="modal-body-scroll">
        <div class="detail-item" style="background:#f3e8ff; border-color:#d8b4fe;">
          <div class="detail-lbl" style="color:#6b21a8;">Query: ${initialPrompt}</div>
          <div style="font-size:12px; color:#3b0764; margin-top:4px; line-height:1.5;">
            <strong>AvaniBot Summary:</strong><br/>
            • <strong>Top 2 Hot Outgoing Calls:</strong> Ritu S. (Score 96 · LG 1.5T AC ₹38,940) and Mukunda (Score 90 · Whirlpool 7kg Washer ₹29,610).<br/>
            • <strong>Urgent Missed Callback:</strong> Faizan A. (+91 98861 77812) called 12m ago regarding Samsung 253L Fridge exchange.<br/>
            • <strong>Coaching Tip:</strong> Mention the 10-year motor/compressor warranty to hit 6/6 SOP and overtake Raju (#2) on the leaderboard!
          </div>
        </div>
      </div>
      <div class="modal-footer-bar">
        <button class="btn-primary-call" onclick="OGApp.closeModal('genericModal'); OGApp.navigate('plan-outgoing');">Open Calling Plan →</button>
      </div>
    `;
    modal.classList.add('open');
  },

  openCustomerDiscussionsModal(selectedLeadId = 'lead-mukunda') {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;
    const threads = this.data.customerDiscussions || [];
    const active = threads.find(t => t.leadId === selectedLeadId) || threads[0];

    sheet.innerHTML = `
      <div class="leads-modal-header" style="background:linear-gradient(135deg, #064e3b, #15803d);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:#a7f3d0; font-weight:700;">#customer-discussions · WhatsApp Business & Voice Proxy</div>
            <div style="font-size:15px; font-weight:700;">${active.name} (${active.phone})</div>
          </div>
          <button class="ac-ctrl-btn" onclick="OGApp.closeModal('genericModal')">✕</button>
        </div>
      </div>
      <div class="modal-body-scroll">
        <div style="display:flex; gap:6px;">
          ${threads.map(t => `
            <button class="btn-secondary-sm" style="${t.id === active.id ? 'background:#dcfce7; border-color:#16a34a;' : ''}" onclick="OGApp.openCustomerDiscussionsModal('${t.leadId}')">${t.name}</button>
          `).join('')}
        </div>
        <div style="background:#efeae2; padding:12px; border-radius:10px; display:flex; flex-direction:column; gap:8px;">
          ${active.messages.map(m => `
            <div style="align-self:${m.sender === 'agent' ? 'flex-end' : 'flex-start'}; background:${m.sender === 'agent' ? '#d9fdd3' : '#ffffff'}; padding:8px 11px; border-radius:10px; max-width:85%; font-size:12px;">
              <div style="font-size:10px; color:#64748b; margin-bottom:2px;">${m.time}</div>
              <div>${m.text}</div>
            </div>
          `).join('')}
        </div>
        <div style="display:flex; gap:6px;">
          <input type="text" id="waReplyInput" placeholder="Send WhatsApp quote / message to ${active.name}..." style="flex:1; padding:8px 10px; border:1px solid var(--border-med); border-radius:8px;" onkeydown="if(event.key==='Enter') OGApp.sendWhatsAppProxyMsg('${active.leadId}')" />
          <button class="btn-primary-call" onclick="OGApp.sendWhatsAppProxyMsg('${active.leadId}')">Send</button>
        </div>
      </div>
      <div class="modal-footer-bar">
        <button class="btn-primary-call" onclick="OGApp.closeModal('genericModal'); OGApp.initiateCallFlow('${active.leadId}', 'lead');">📞 Place Voice Call to ${active.name}</button>
      </div>
    `;
    modal.classList.add('open');
  },

  sendWhatsAppProxyMsg(leadId) {
    const inp = document.getElementById('waReplyInput');
    if (!inp || !inp.value.trim()) return;
    const thread = this.data.customerDiscussions.find(t => t.leadId === leadId);
    if (thread) {
      thread.messages.push({
        sender: 'agent',
        time: 'Just now',
        text: inp.value.trim()
      });
      this.saveData();
      this.openCustomerDiscussionsModal(leadId);
    }
  },

  openKeypadModal() {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:15px; font-weight:700;">🔢 Direct Phone Dialer & Keypad</div>
          <button class="ac-ctrl-btn" onclick="OGApp.closeModal('genericModal')">✕</button>
        </div>
      </div>
      <div class="modal-body-scroll">
        <input type="text" id="keypadNumberInput" value="+91 98450 11223" style="width:100%; font-size:18px; font-weight:700; text-align:center; padding:10px; border:1px solid var(--border-med); border-radius:10px;" />
        <div class="keypad-grid">
          ${['1','2','3','4','5','6','7','8','9','*','0','#'].map(d => `
            <button class="keypad-key" onclick="OGApp.pressKeypadDigit('${d}')">${d}</button>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer-bar">
        <button class="btn-secondary-sm" onclick="document.getElementById('keypadNumberInput').value='+91 '">Clear</button>
        <button class="btn-primary-call" onclick="OGApp.dialFromKeypad()">📞 Place Live Call</button>
      </div>
    `;
    modal.classList.add('open');
  },

  pressKeypadDigit(d) {
    window.OGCalling.playDTMF(d);
    const inp = document.getElementById('keypadNumberInput');
    if (inp) inp.value += d;
  },

  dialFromKeypad() {
    const inp = document.getElementById('keypadNumberInput');
    const num = inp ? inp.value.trim() : '+91 98450 11223';
    this.closeModal('genericModal');
    const matchedLead = this.data.leads.find(l => l.phone.replace(/\s+/g, '') === num.replace(/\s+/g, ''));
    const target = matchedLead || {
      id: 'lead-dialed',
      name: 'Dialed Customer',
      phone: num,
      preferredProduct: 'LG 1.5T 5-Star Dual Inverter AC',
      crossSell: 'V-Guard 4kVA Stabilizer',
      emi: '6m No-Cost EMI · ₹6,490/mo',
      story: `Outbound call dialed via keypad to ${num}.`
    };
    this.navigate('active-call');
    window.OGCalling.startCall(target, { mode: window.OGCalling.mode });
  },

  openUserSettingsModal() {
    const modal = document.getElementById('genericModal');
    const sheet = document.getElementById('genericModalSheet');
    if (!modal || !sheet) return;

    sheet.innerHTML = `
      <div class="leads-modal-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:15px; font-weight:700;">⚙️ Agent Profile & Voice Bridge Settings</div>
          <button class="ac-ctrl-btn" onclick="OGApp.closeModal('genericModal')">✕</button>
        </div>
      </div>
      <div class="modal-body-scroll">
        <div class="detail-item">
          <div class="detail-lbl">Signed in as</div>
          <div class="detail-val"><strong>${this.data.agent.fullName}</strong> · ${this.data.agent.role} (${this.data.agent.hub})</div>
        </div>
        <div class="detail-item">
          <div class="detail-lbl">Human-to-Human & AI-to-Human Calling Demo Tools</div>
          <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
            <button class="btn-primary-call" onclick="OGCalling.openCompanionPhone()">👥 Open Customer Companion Phone</button>
            <button class="btn-secondary-sm" onclick="OGCalling.speakText('Namaste Avani! On-Ground voice synthesis is active and ready.')">🔊 Test Voice Audio</button>
            <button class="btn-secondary-sm" onclick="OGStore.reset(); location.reload();">🔄 Reset Demo Data</button>
          </div>
        </div>
      </div>
    `;
    modal.classList.add('open');
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  },

  toast(msg) {
    const box = document.getElementById('toastContainer');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'toast-msg';
    div.textContent = msg;
    box.appendChild(div);
    setTimeout(() => {
      div.remove();
    }, 3200);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.OGApp.init();
});
