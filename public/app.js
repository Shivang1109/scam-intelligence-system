// ScamShield - AI Honeypot Intelligence Platform
// Frontend Application Logic

const API_KEY = 'test-api-key-12345';
const API_URL = '/api/v1';

// State
let conversationId = null;
let messageCount = 0;
let entityCount = 0;
let signalCount = 0;
let totalScans = 0;
let allEntities = new Set();

// Scam Presets
const PRESETS = {
  irs: "This is the IRS. Your social security number has been suspended due to suspicious activity. You owe $3,847 in back taxes. Failure to respond immediately will result in arrest. Call us back at 1-800-555-0192.",
  bank: "URGENT: Your Bank of America account has been compromised! Unauthorized transactions detected. Account will be frozen in 2 hours. Verify your account by providing your card number and PIN at secure-bankofamerica-verify.com",
  tech: "Hello, this is Microsoft Technical Support. We detected a dangerous virus on your computer. Your system is sending error codes to our servers. Download our remote access tool immediately at support-microsoft-help.net to prevent data loss.",
  romance: "My darling, I am a widowed oil engineer working offshore in Nigeria. I have fallen deeply in love with you. I need $2,000 for my flight to meet you. Please send via Western Union to account 7734521890.",
  crypto: "CONGRATULATIONS! You have been selected for our exclusive Bitcoin investment program. Invest $500 today and receive $5,000 in 7 days — guaranteed 900% returns. Send BTC to wallet: bc1q9h7gd3kf8a2x...",
  lottery: "You have WON the UK National Lottery — £850,000! To claim your prize, pay a £250 processing fee via iTunes gift cards. Contact: lottery-claims@prize-notification.com"
};

// Load preset into input
function usePreset(type) {
  document.getElementById('chatInput').value = PRESETS[type];
  document.getElementById('chatInput').focus();
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
        body: JSON.stringify({ initialMessage: msg })
      });
      
      if (!res.ok) throw new Error(res.status);
      
      data = await res.json();
      conversationId = data.conversationId || data.id;
      document.getElementById('sbConvId').textContent = 'SESSION: ' + conversationId.substring(0, 8).toUpperCase();
      
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
        body: JSON.stringify({ message: msg })
      });
      
      if (!res.ok) throw new Error(res.status);
      
      data = await res.json();
      setTimeout(refreshConversation, 300);
      removeTypingIndicator();
      addMessage('agent', data.content || data.message || 'Processing...');
    }
  } catch (e) {
    console.error('API Error:', e);
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
  
  updateStatusBar();
}

// Simulate local analysis (fallback when backend unavailable)
function simulateLocalAnalysis(msg) {
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
  const e = document.createElement('div');
  e.className = 'toast ' + type;
  e.textContent = msg;
  document.body.appendChild(e);
  setTimeout(() => e.remove(), 3500);
}
