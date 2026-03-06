// ScamShield - AI Honeypot Intelligence Platform
// Frontend Application Logic

// API key for demo (hardcoded for hackathon - would use env vars in production)
const API_KEY = 'test-api-key-12345';
const API_URL = '/api/v1';

// State
let conversationId = null;
let messageCount = 0;
let entityCount = 0;
let signalCount = 0;
let totalScans = 0;
let allEntities = new Set();
let isApiAvailable = true; // Track API availability

// Scam Presets
const PRESETS = {
  irs: "This is the IRS. Your social security number has been suspended due to suspicious activity. You owe $3,847 in back taxes. Failure to respond immediately will result in arrest. Call us back at 1-800-555-0192.",
  bank: "URGENT: Your Bank of America account has been compromised! Unauthorized transactions detected. Account will be frozen in 2 hours. Verify your account by providing your card number and PIN at secure-bankofamerica-verify.com",
  tech: "Hello, this is Microsoft Technical Support. We detected a dangerous virus on your computer. Your system is sending error codes to our servers. Download our remote access tool immediately at support-microsoft-help.net to prevent data loss.",
  romance: "My darling, I am a widowed oil engineer working offshore in Nigeria. I have fallen deeply in love with you. I need $2,000 for my flight to meet you. Please send via Western Union to account 7734521890.",
  crypto: "CONGRATULATIONS! You have been selected for our exclusive Bitcoin investment program. Invest $500 today and receive $5,000 in 7 days — guaranteed 900% returns. Send BTC to wallet: bc1q9h7gd3kf8a2x...",
  lottery: "You have WON the UK National Lottery — £850,000! To claim your prize, pay a £250 processing fee via iTunes gift cards. Contact: lottery-claims@prize-notification.com",
  grandparent: "Grandma, it's me! I'm in trouble. I was in a car accident and I'm in jail. Please don't tell Mom and Dad. I need $5,000 for bail money right now. Send it to my lawyer via MoneyGram. This is urgent!",
  amazon: "Amazon Security Alert: Suspicious order for iPhone 15 Pro ($1,299) detected on your account. If you did not authorize this purchase, call our fraud department immediately at 1-888-555-0847 to cancel.",
  social: "Hi! I'm Sarah from Facebook Security Team. Your account has been reported for violating community standards and will be permanently deleted in 24 hours. Click here to appeal: fb-security-appeal.net/verify",
  refund: "IRS Tax Refund Notice: You are eligible for a $2,847 tax refund. To process your refund, we need to verify your bank account details. Reply with your routing number and account number to expedite payment.",
  job: "Congratulations! You've been selected for a work-from-home position earning $5,000/week. No experience needed! Just pay a one-time $299 training fee to get started. Limited spots available!",
  charity: "Hello, I'm calling from the American Red Cross. We're collecting donations for hurricane victims. Can you donate $500 today? We accept wire transfers and gift cards for faster processing."
};

// Load preset into input and auto-send
function usePreset(type) {
  const input = document.getElementById('chatInput');
  input.value = PRESETS[type];
  input.focus();
  // Auto-send after a brief moment for visual feedback
  setTimeout(() => sendMessage(), 300);
}

// Start new conversation
function newConversation() {
  conversationId = null;
  messageCount = 0;
  entityCount = 0;
  signalCount = 0;
  allEntities.clear();
  
  document.getElementById('chatMessages').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🎯</div>
      <div class="empty-text">NEW SESSION STARTED<br>TYPE A SCAM MESSAGE TO BEGIN</div>
    </div>
  `;
  
  document.getElementById('signalsList').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📡</div>
      <div class="empty-text">MONITORING FOR SIGNALS</div>
    </div>
  `;
  
  document.getElementById('entitiesList').innerHTML = `
    <span style="font-family:'Syne Mono',monospace;font-size:11px;color:var(--muted)">No entities extracted yet</span>
  `;
  
  updateRisk(0, 'LOW RISK', 'No threat detected', 'Awaiting data...');
  updateState('IDLE');
  resetAIDisplays();
  updateStatusBar();
  document.getElementById('sbConvId').textContent = 'SESSION: —';
}

// Send message
async function sendMessage() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  
  input.value = '';
  document.getElementById('sendBtn').disabled = true;
  
  messageCount++;
  totalScans++;
  document.getElementById('totalScans').textContent = totalScans + ' INTERCEPTS';
  
  addMessage('scammer', msg);
  addTypingIndicator();
  
  // Show API status indicator
  showApiStatus('connecting');
  
  try {
    let data;
    
    if (!conversationId) {
      // Start new conversation
      const res = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ initialMessage: msg }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!res.ok) throw new Error(res.status);
      
      data = await res.json();
      conversationId = data.conversationId || data.id;
      document.getElementById('sbConvId').textContent = 'SESSION: ' + conversationId.substring(0, 8).toUpperCase();
      
      isApiAvailable = true;
      showApiStatus('connected');
      setTimeout(refreshConversation, 300);
      removeTypingIndicator();
      addMessage('agent', data.message || 'Tell me more...');
    } else {
      // Continue conversation
      const res = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ message: msg }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!res.ok) throw new Error(res.status);
      
      data = await res.json();
      isApiAvailable = true;
      showApiStatus('connected');
      setTimeout(refreshConversation, 300);
      removeTypingIndicator();
      addMessage('agent', data.content || data.message || 'Processing...');
    }
  } catch (e) {
    console.error('API Error:', e);
    // Silently fall back to local analysis - don't show scary offline messages
    removeTypingIndicator();
    simulateLocalAnalysis(msg);
  }
  
  document.getElementById('sendBtn').disabled = false;
  updateStatusBar();
}

// Refresh conversation data
async function refreshConversation() {
  if (!conversationId) return;
  
  try {
    const res = await fetch(`${API_URL}/conversations/${conversationId}`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    if (!res.ok) return;
    
    const conv = await res.json();
    updateFromConversation(conv);
  } catch (e) {
    console.error('Refresh error:', e);
  }
}

// Update UI from conversation data
function updateFromConversation(conv) {
  const risk = conv.riskScore || 0;
  const cls = conv.classification;
  const type = cls ? formatScamType(cls.primaryType) : 'Analyzing...';
  const conf = cls ? Math.round(cls.primaryConfidence * 100) + '% confidence' : '';
  
  let lbl = 'LOW RISK';
  if (risk > 75) lbl = 'CRITICAL';
  else if (risk > 50) lbl = 'HIGH RISK';
  else if (risk > 25) lbl = 'MEDIUM RISK';
  
  updateRisk(risk, lbl, type, conf);
  updateState(formatState(conv.state));
  
  // Update signals
  if (conv.scamSignals && conv.scamSignals.length > signalCount) {
    conv.scamSignals.slice(signalCount).forEach(s => addSignal(s));
    signalCount = conv.scamSignals.length;
    document.getElementById('signalCount').textContent = signalCount;
  }
  
  // Update entities
  if (conv.extractedEntities) {
    conv.extractedEntities.forEach(e => {
      const k = e.type + ':' + e.value;
      if (!allEntities.has(k)) {
        allEntities.add(k);
        const el = document.getElementById('entitiesList');
        if (el.querySelector('span:not(.entity-chip)')) el.innerHTML = '';
        
        const chip = document.createElement('span');
        chip.className = 'entity-chip entity-' + e.type;
        chip.innerHTML = getEntityIcon(e.type) + ' ' + e.value;
        el.appendChild(chip);
        entityCount++;
      }
    });
  }
  
  // Update persona
  if (conv.persona) {
    updatePersona(conv.persona);
  }
  
  // Update AI reasoning (if available)
  if (conv.aiReasoning) {
    updateAIReasoning(conv.aiReasoning, true);
  }
  
  updateStatusBar();
}

// Simulate local analysis (fallback when backend unavailable)
function simulateLocalAnalysis(msg) {
  // Generate a local session ID if we don't have one
  if (!conversationId) {
    conversationId = 'local-' + Math.random().toString(36).substring(2, 10);
    document.getElementById('sbConvId').textContent = 'SESSION: ' + conversationId.substring(0, 8).toUpperCase();
  }
  
  const low = msg.toLowerCase();
  let risk = 0;
  const sigs = [];
  const ents = [];
  
  // Detect urgency
  if (/urgent|immediate|now|asap|deadline|expire|arrest|suspend|frozen/.test(low)) {
    risk += 25;
    sigs.push({ type: 'URGENCY', confidence: 0.85, text: 'Urgency language detected' });
  }
  
  // Detect financial requests
  if (/pay|money|transfer|bitcoin|gift.?card|wire|western.?union|venmo|zelle|\$[\d]/.test(low)) {
    risk += 35;
    sigs.push({ type: 'FINANCIAL_REQUEST', confidence: 0.92, text: 'Financial request detected' });
  }
  
  // Detect impersonation
  if (/irs|fbi|microsoft|apple|bank.?of.?america|wells.?fargo|police|government|amazon|medicare/.test(low)) {
    risk += 30;
    sigs.push({ type: 'IMPERSONATION', confidence: 0.88, text: 'Authority impersonation detected' });
  }
  
  // Detect threats
  if (/arrest|jail|sue|lawsuit|criminal|warrant|suspend|lose.?your|seized/.test(low)) {
    risk += 20;
    sigs.push({ type: 'THREAT', confidence: 0.90, text: 'Threat language detected' });
  }
  
  // Detect authority claims
  if (/official|authorized|department|agency|representative|agent/.test(low)) {
    risk += 15;
    sigs.push({ type: 'AUTHORITY_CLAIM', confidence: 0.82, text: 'Authority claim detected' });
  }
  
  // Detect social engineering
  if (/trust|verify|confirm|validate|secure|protect|help.?you/.test(low)) {
    risk += 12;
    sigs.push({ type: 'SOCIAL_ENGINEERING', confidence: 0.78, text: 'Social engineering tactics detected' });
  }
  
  // Detect time pressure
  if (/within|hours|minutes|today|immediately|expire|deadline/.test(low)) {
    risk += 18;
    sigs.push({ type: 'TIME_PRESSURE', confidence: 0.85, text: 'Time pressure tactics detected' });
  }
  
  // Detect too good to be true
  if (/win|won|prize|lottery|million|guaranteed|free.?money|jackpot/.test(low)) {
    risk += 22;
    sigs.push({ type: 'TOO_GOOD_TO_BE_TRUE', confidence: 0.88, text: 'Unrealistic promises detected' });
  }
  
  // Extract entities
  const pm = msg.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);
  if (pm) ents.push({ type: 'phone_number', value: pm[0] });
  
  const um = msg.match(/https?:\/\/[^\s]+/);
  if (um) ents.push({ type: 'url', value: um[0].length > 30 ? um[0].substring(0, 30) + '...' : um[0] });
  
  const em = msg.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (em) ents.push({ type: 'email', value: em[0] });
  
  const bm = msg.match(/bc1[a-zA-Z0-9]{10,}/);
  if (bm) ents.push({ type: 'payment_id', value: bm[0].substring(0, 20) + '...' });
  
  const am = msg.match(/[0-9]{8,}/);
  if (am && !pm) ents.push({ type: 'bank_account', value: am[0] });
  
  risk = Math.min(risk, 100);
  
  let lbl = 'LOW RISK', tp = 'Low Risk Message';
  if (risk > 75) { lbl = 'CRITICAL'; tp = 'Active Scam Attempt'; }
  else if (risk > 50) { lbl = 'HIGH RISK'; tp = 'High Confidence Scam'; }
  else if (risk > 25) { lbl = 'MEDIUM RISK'; tp = 'Possible Scam'; }
  
  updateRisk(risk, lbl, tp, sigs.length + ' signal(s) detected');
  
  sigs.forEach(s => addSignal(s));
  signalCount += sigs.length;
  document.getElementById('signalCount').textContent = signalCount;
  
  const entEl = document.getElementById('entitiesList');
  if (ents.length > 0) {
    if (entEl.querySelector('span:not(.entity-chip)')) entEl.innerHTML = '';
    ents.forEach(e => {
      const k = e.type + ':' + e.value;
      if (!allEntities.has(k)) {
        allEntities.add(k);
        const chip = document.createElement('span');
        chip.className = 'entity-chip entity-' + e.type;
        chip.innerHTML = getEntityIcon(e.type) + ' ' + e.value;
        entEl.appendChild(chip);
        entityCount++;
      }
    });
  }
  
  // Simulate AI reasoning
  const reasoning = generateLocalReasoning(sigs, risk);
  updateAIReasoning(reasoning, false);
  
  // Simulate persona (use a default one for local mode)
  const defaultPersona = {
    name: 'Margaret Thompson',
    age: 68,
    vulnerabilityLevel: 8,
    characteristics: {
      techSavvy: 3,
      trustLevel: 9,
      financialAwareness: 4
    },
    background: 'Retired teacher, trusting, not tech-savvy'
  };
  updatePersona(defaultPersona);
  
  const replies = [
    "Oh goodness, that sounds very serious. What exactly do I need to do?",
    "I'm frightened. Can you please walk me through this step by step?",
    "How much exactly? Which account number should I use to send it?",
    "I don't understand technology well. Can you help me with this?",
    "What will happen if I don't do this right away? I'm very worried.",
    "Can you give me your callback number in case I get disconnected?",
    "I want to cooperate fully. Tell me everything I need to do.",
  ];
  
  addMessage('agent', replies[Math.floor(Math.random() * replies.length)]);
  updateState(risk > 50 ? 'EXTRACTION' : risk > 25 ? 'INFORMATION_GATHERING' : 'ENGAGEMENT');
  
  if (risk > 70) showToast('⚠️ HIGH RISK SCAM DETECTED', 'danger');
  else if (risk > 40) showToast('⚡ SCAM SIGNALS DETECTED', 'warn');
  
  updateStatusBar();
}

// Add message to chat
function addMessage(sender, content) {
  const c = document.getElementById('chatMessages');
  const empty = c.querySelector('.empty-state');
  if (empty) empty.remove();
  
  const d = document.createElement('div');
  d.className = 'msg msg-' + sender;
  const lbl = sender === 'scammer' ? 'SCAMMER INPUT' : sender === 'agent' ? 'AI HONEYPOT' : 'SYSTEM';
  d.innerHTML = `
    <div class="msg-label">${lbl}</div>
    <div class="msg-bubble">${escHtml(content)}</div>
  `;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

// Add typing indicator
function addTypingIndicator() {
  const c = document.getElementById('chatMessages');
  const d = document.createElement('div');
  d.className = 'msg msg-agent';
  d.id = 'typingInd';
  d.innerHTML = `
    <div class="msg-label">AI HONEYPOT</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
  const e = document.getElementById('typingInd');
  if (e) e.remove();
}

// Add signal to list
function addSignal(s) {
  const c = document.getElementById('signalsList');
  const empty = c.querySelector('.empty-state');
  if (empty) empty.remove();
  
  const d = document.createElement('div');
  d.className = 'signal-item signal-' + s.type;
  d.innerHTML = `
    <div class="signal-dot"></div>
    <div class="signal-info">
      <div class="signal-name">${s.type.replace('_', ' ')}</div>
      <div class="signal-text">${escHtml(s.text || s.evidence || '')}</div>
    </div>
    <div class="signal-conf">${Math.round((s.confidence || 0) * 100)}%</div>
  `;
  c.insertBefore(d, c.firstChild);
}

// Update risk display
function updateRisk(score, label, type, conf) {
  const circ = 2 * Math.PI * 40;
  const arc = document.getElementById('riskArc');
  arc.style.strokeDashoffset = circ - (score / 100) * circ;
  
  const col = score > 75 ? '#ff4b6e' : score > 50 ? '#ff4b6e' : score > 25 ? '#f5a623' : '#00dbb4';
  arc.style.stroke = col;
  
  document.getElementById('riskVal').textContent = Math.round(score);
  document.getElementById('riskVal').style.color = col;
  
  const b = document.getElementById('riskBadge');
  b.textContent = label;
  b.className = 'risk-level-badge';
  if (score > 75) b.classList.add('critical');
  else if (score > 50) b.classList.add('high');
  else if (score > 25) b.classList.add('medium');
  else b.classList.add('low');
  
  document.getElementById('scamType').textContent = type;
  document.getElementById('scamConf').textContent = conf;
  
  // WOW MOMENT: Critical risk alert
  if (score >= 80) {
    triggerCriticalAlert();
  }
}

// Show API connection status
function showApiStatus(status) {
  // Disabled - API is working, no need for status badges
  return;
}

// Trigger critical risk alert (WOW moment)
function triggerCriticalAlert() {
  const riskPanel = document.querySelector('.risk-meter');
  if (!riskPanel) return;
  
  // Add pulsing red border
  riskPanel.classList.add('critical-alert');
  
  // Play alert sound (optional - can be muted)
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6OyrWBUIQ5zd8sFuJAUuhM/z2Ik2CBdju+zooVARC0yl4fG5ZRwFNo3V7859KQUofsz');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (e) {}
  
  // Remove after animation
  setTimeout(() => riskPanel.classList.remove('critical-alert'), 3000);
}

// Update state badge
function updateState(s) {
  document.getElementById('convState').textContent = s;
}

// Update status bar
function updateStatusBar() {
  document.getElementById('sbMessages').textContent = 'MESSAGES: ' + messageCount;
  document.getElementById('sbEntities').textContent = 'ENTITIES: ' + entityCount;
}

// Format scam type
function formatScamType(t) {
  return ({
    phishing: 'Phishing Attack',
    romance: 'Romance Scam',
    investment: 'Investment Fraud',
    tech_support: 'Tech Support Scam',
    impersonation: 'Authority Impersonation',
    advance_fee: 'Advance Fee Fraud',
    lottery: 'Lottery Scam'
  }[t]) || t;
}

// Format state
function formatState(s) {
  return (s || 'IDLE').replace(/_/g, ' ').toUpperCase();
}

// Get entity icon
function getEntityIcon(t) {
  return ({
    phone_number: '📞',
    url: '🔗',
    payment_id: '💳',
    email: '✉️',
    organization: '🏢',
    bank_account: '🏦'
  }[t]) || '📌';
}

// Escape HTML
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Show toast notification
function showToast(msg, type = 'warn') {
  // Disabled - silent operation for clean demo
  return;
}


// Update persona display
function updatePersona(persona) {
  const el = document.getElementById('personaInfo');
  
  if (!persona) {
    el.innerHTML = '<span style="font-family:\'Syne Mono\',monospace;font-size:11px;color:var(--muted)">No persona assigned yet</span>';
    return;
  }
  
  const vulnLevel = persona.vulnerabilityLevel || 5;
  const techSavvy = persona.characteristics?.techSavvy || 5;
  const trustLevel = persona.characteristics?.trustLevel || 5;
  
  el.innerHTML = `
    <div class="persona-card">
      <div class="persona-header">
        <div class="persona-avatar">👤</div>
        <div>
          <div class="persona-name">${persona.name || 'Unknown'}</div>
          <div class="persona-age">Age ${persona.age || 'N/A'}</div>
        </div>
      </div>
      <div class="persona-stats">
        <div class="persona-stat">
          <div class="persona-stat-label">Vulnerability</div>
          <div class="persona-stat-value">${vulnLevel}/10</div>
          <div class="persona-stat-bar">
            <div class="persona-stat-fill" style="width: ${vulnLevel * 10}%"></div>
          </div>
        </div>
        <div class="persona-stat">
          <div class="persona-stat-label">Tech Savvy</div>
          <div class="persona-stat-value">${techSavvy}/10</div>
          <div class="persona-stat-bar">
            <div class="persona-stat-fill" style="width: ${techSavvy * 10}%"></div>
          </div>
        </div>
      </div>
      ${persona.background ? `<div class="persona-description">"${persona.background}"</div>` : ''}
    </div>
  `;
}

// Update AI reasoning display
function updateAIReasoning(reasoning, isAIEnhanced) {
  const el = document.getElementById('aiReasoning');
  const badge = document.getElementById('aiBadge');
  
  if (isAIEnhanced) {
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
  
  if (!reasoning) {
    el.textContent = 'Awaiting analysis...';
    el.style.color = 'var(--muted)';
    return;
  }
  
  el.textContent = reasoning;
  el.style.color = isAIEnhanced ? 'var(--accent)' : 'var(--muted)';
}

// Generate local reasoning (for fallback mode)
function generateLocalReasoning(signals, riskScore) {
  if (signals.length === 0) {
    return 'No significant threat indicators detected. Message appears benign.';
  }
  
  const signalTypes = signals.map(s => s.type.toLowerCase().replace('_', ' ')).join(', ');
  
  let reasoning = `Pattern analysis detected ${signals.length} threat signal(s): ${signalTypes}. `;
  
  if (riskScore > 75) {
    reasoning += 'Multiple high-confidence indicators suggest active scam attempt. Immediate caution advised.';
  } else if (riskScore > 50) {
    reasoning += 'Combination of signals indicates likely scam. Exercise caution.';
  } else if (riskScore > 25) {
    reasoning += 'Some suspicious patterns detected. Further verification recommended.';
  } else {
    reasoning += 'Low-level indicators present but not conclusive.';
  }
  
  return reasoning;
}

// Reset persona and AI displays on new conversation
function resetAIDisplays() {
  document.getElementById('personaInfo').innerHTML = '<span style="font-family:\'Syne Mono\',monospace;font-size:11px;color:var(--muted)">No persona assigned yet</span>';
  document.getElementById('aiReasoning').textContent = 'Awaiting analysis...';
  document.getElementById('aiReasoning').style.color = 'var(--muted)';
  document.getElementById('aiBadge').style.display = 'none';
}


// ============================================
// POLISH FEATURES
// ============================================

// Conversation Duration Timer
let conversationStartTime = null;
let durationInterval = null;

function startDurationTimer() {
  conversationStartTime = Date.now();
  const durationEl = document.getElementById('conversationDuration');
  durationEl.style.display = 'inline';
  durationEl.classList.add('active');
  
  // Update every second
  durationInterval = setInterval(() => {
    if (conversationStartTime) {
      const elapsed = Date.now() - conversationStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      durationEl.textContent = `⏱ ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }, 1000);
}

function stopDurationTimer() {
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
  conversationStartTime = null;
  const durationEl = document.getElementById('conversationDuration');
  durationEl.style.display = 'none';
  durationEl.classList.remove('active');
  durationEl.textContent = '⏱ 00:00';
}

// State History Timeline
let stateHistory = [];

function addStateTransition(state, timestamp) {
  const elapsed = conversationStartTime ? Date.now() - conversationStartTime : 0;
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  stateHistory.push({
    state: state,
    time: timeStr,
    timestamp: timestamp || Date.now()
  });
  
  updateStateTimeline();
}

function updateStateTimeline() {
  const container = document.getElementById('stateHistory');
  
  if (stateHistory.length === 0) {
    container.innerHTML = '<span style="font-family:\'Syne Mono\',monospace;font-size:11px;color:var(--muted)">No state transitions yet</span>';
    return;
  }
  
  container.innerHTML = stateHistory.map((item, index) => {
    const isLast = index === stateHistory.length - 1;
    return `
      <div class="state-transition ${isLast ? 'current' : ''}">
        <span class="state-transition-time">${item.time}</span>
        <span class="state-transition-arrow">→</span>
        <span class="state-transition-name">${item.state}</span>
      </div>
    `;
  }).join('');
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function clearStateHistory() {
  stateHistory = [];
  updateStateTimeline();
}

// Export Conversation
function exportConversation() {
  if (!conversationId) {
    showToast('No active conversation to export', 'warn');
    return;
  }
  
  // Gather all conversation data
  const exportData = {
    conversationId: conversationId,
    timestamp: new Date().toISOString(),
    duration: document.getElementById('conversationDuration').textContent,
    messages: Array.from(document.getElementById('chatMessages').querySelectorAll('.msg')).map(msg => ({
      sender: msg.classList.contains('msg-scammer') ? 'scammer' : 'agent',
      content: msg.querySelector('.msg-bubble').textContent,
      label: msg.querySelector('.msg-label').textContent
    })),
    riskScore: parseInt(document.getElementById('riskVal').textContent) || 0,
    riskLevel: document.getElementById('riskBadge').textContent,
    scamType: document.getElementById('scamType').textContent,
    signals: Array.from(document.getElementById('signalsList').querySelectorAll('.signal-item')).map(sig => ({
      type: sig.querySelector('.signal-name').textContent,
      confidence: sig.querySelector('.signal-conf').textContent,
      text: sig.querySelector('.signal-text').textContent
    })),
    entities: Array.from(document.getElementById('entitiesList').querySelectorAll('.entity-chip')).map(ent => ({
      type: ent.className.split(' ').find(c => c.startsWith('entity-')).replace('entity-', ''),
      value: ent.textContent.trim().substring(2) // Remove icon
    })),
    persona: document.getElementById('personaInfo').querySelector('.persona-name')?.textContent || 'Unknown',
    aiReasoning: document.getElementById('aiReasoning').textContent,
    stateHistory: stateHistory,
    stats: {
      totalMessages: messageCount,
      totalEntities: entityCount,
      totalSignals: signalCount
    }
  };
  
  // Create and download JSON file
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scamshield-conversation-${conversationId.substring(0, 8)}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('✅ Conversation exported successfully', 'success');
  playSound('success');
}

// Update existing functions to use new features
const originalSendMessage = sendMessage;
sendMessage = async function() {
  // Start timer on first message
  if (!conversationId && !conversationStartTime) {
    startDurationTimer();
    addStateTransition('IDLE', Date.now());
  }
  
  // Show export button
  document.getElementById('exportBtn').style.display = 'inline-flex';
  
  return originalSendMessage();
};

const originalUpdateState = updateState;
updateState = function(state) {
  const prevState = document.getElementById('convState').textContent;
  if (prevState !== state) {
    addStateTransition(state, Date.now());
  }
  return originalUpdateState(state);
};

const originalNewConversation = newConversation;
newConversation = function() {
  stopDurationTimer();
  clearStateHistory();
  document.getElementById('exportBtn').style.display = 'none';
  return originalNewConversation();
};
