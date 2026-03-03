// API Configuration
const API_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'test-api-key-12345';

// State
let currentConversationId = null;
let stats = {
    totalScans: 0,
    threatsDetected: 0,
    scamTypes: {}
};

// Example Messages
const examples = {
    phishing: "URGENT! Your bank account has been compromised. Click this link immediately: http://fake-bank.com/verify or call +1-800-555-0123 to secure your account within 24 hours!",
    romance: "Hi my love, I'm stuck in Nigeria and need $5000 urgently for medical emergency. Please wire money to Western Union. I love you so much and can't wait to meet you!",
    tech: "WARNING! This is Microsoft Support. Your computer has 37 critical viruses detected! Call us immediately at +1-888-999-0000 or your data will be permanently deleted in 2 hours!",
    investment: "🚀 GUARANTEED 500% returns in just 30 days! Limited spots available. Invest $1000 now and become a millionaire! Contact: invest@crypto-scam.com or WhatsApp: +1-555-GET-RICH",
    lottery: "CONGRATULATIONS! You've won $5,000,000 in the International Lottery! To claim your prize, send $500 processing fee to: winner@lottery-scam.com. Act now!"
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    loadStats();
    updateDashboard();
    animateCounters();
});

// Particle Animation
function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 100;
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.opacity = Math.random() * 0.5 + 0.2;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }
        
        draw() {
            ctx.fillStyle = `rgba(0, 240, 255, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        // Draw connections
        particles.forEach((p1, i) => {
            particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    ctx.strokeStyle = `rgba(0, 240, 255, ${0.2 * (1 - distance / 100)})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            });
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Animate Counters
function animateCounters() {
    animateCounter('heroScans', stats.totalScans, 2000);
    animateCounter('heroThreats', stats.threatsDetected, 2000);
}

function animateCounter(id, target, duration) {
    const element = document.getElementById(id);
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Scroll to Analyzer
function scrollToAnalyzer() {
    document.getElementById('analyzer').scrollIntoView({ behavior: 'smooth' });
}

// Load Example
function loadExample(type) {
    document.getElementById('analyzeInput').value = examples[type];
    document.getElementById('analyzeInput').focus();
}

// Quick Analyze
async function quickAnalyze() {
    const message = document.getElementById('analyzeInput').value.trim();
    
    if (!message) {
        showToast('Please enter a message to analyze', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_URL}/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({ initialMessage: message })
        });
        
        if (!response.ok) throw new Error('API Error');
        
        const data = await response.json();
        const conversationId = data.conversationId;
        
        const detailsResponse = await fetch(`${API_URL}/conversations/${conversationId}`, {
            headers: { 'X-API-Key': API_KEY }
        });
        
        const details = await detailsResponse.json();
        
        displayResults(details);
        updateStats(details);
        showToast('Analysis complete!', 'success');
        
    } catch (error) {
        showToast('Failed to analyze message. Please ensure the server is running.', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// Display Results
function displayResults(data) {
    const riskScore = data.riskScore || 0;
    const classification = data.classification;
    const entities = data.extractedEntities || [];
    const signals = data.scamSignals || [];
    const persona = data.persona;
    
    // Threat Display
    const threatDisplay = document.getElementById('threatDisplay');
    const threatScore = document.getElementById('threatScore');
    const threatLabel = document.getElementById('threatLabel');
    const threatBadge = document.getElementById('threatBadge');
    const threatType = document.getElementById('threatType');
    const threatConfidence = document.getElementById('threatConfidence');
    const threatCircle = document.getElementById('threatCircle');
    
    // Animate score
    animateCounter('threatScore', Math.round(riskScore), 1500);
    
    // Animate circle
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (riskScore / 100) * circumference;
    threatCircle.style.strokeDashoffset = offset;
    
    // Set colors and labels based on risk
    if (riskScore >= 70) {
        threatDisplay.style.borderColor = 'var(--danger)';
        threatScore.style.color = 'var(--danger)';
        threatLabel.textContent = 'HIGH RISK';
        threatBadge.innerHTML = '<i class="fas fa-skull-crossbones"></i><span>CRITICAL THREAT</span>';
        threatBadge.style.borderColor = 'var(--danger)';
        threatBadge.style.background = 'rgba(255, 51, 102, 0.1)';
        threatCircle.style.stroke = 'var(--danger)';
    } else if (riskScore >= 40) {
        threatDisplay.style.borderColor = 'var(--warning)';
        threatScore.style.color = 'var(--warning)';
        threatLabel.textContent = 'MEDIUM RISK';
        threatBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>SUSPICIOUS</span>';
        threatBadge.style.borderColor = 'var(--warning)';
        threatBadge.style.background = 'rgba(255, 170, 0, 0.1)';
        threatCircle.style.stroke = 'var(--warning)';
    } else {
        threatDisplay.style.borderColor = 'var(--success)';
        threatScore.style.color = 'var(--success)';
        threatLabel.textContent = 'LOW RISK';
        threatBadge.innerHTML = '<i class="fas fa-check-circle"></i><span>SAFE</span>';
        threatBadge.style.borderColor = 'var(--success)';
        threatBadge.style.background = 'rgba(0, 255, 136, 0.1)';
        threatCircle.style.stroke = 'var(--success)';
    }
    
    if (classification) {
        threatType.textContent = `Type: ${classification.primaryType.toUpperCase()}`;
        threatConfidence.textContent = `Confidence: ${Math.round(classification.primaryConfidence * 100)}%`;
    }
    
    // Entities
    const entitiesList = document.getElementById('entitiesList');
    const entityCount = document.getElementById('entityCount');
    entitiesList.innerHTML = '';
    entityCount.textContent = entities.length;
    
    if (entities.length === 0) {
        entitiesList.innerHTML = '<div class="empty-state">No entities detected</div>';
    } else {
        entities.forEach((entity, index) => {
            setTimeout(() => {
                const item = document.createElement('div');
                item.className = 'data-item';
                item.innerHTML = `
                    <div class="data-header">
                        <span class="data-type">${entity.type}</span>
                        <span class="data-confidence">${Math.round(entity.confidence * 100)}%</span>
                    </div>
                    <div class="data-value">${entity.value}</div>
                `;
                entitiesList.appendChild(item);
            }, index * 100);
        });
    }
    
    // Signals
    const signalsList = document.getElementById('signalsList');
    const signalCount = document.getElementById('signalCount');
    signalsList.innerHTML = '';
    signalCount.textContent = signals.length;
    
    if (signals.length === 0) {
        signalsList.innerHTML = '<div class="empty-state">No scam signals detected</div>';
    } else {
        signals.forEach((signal, index) => {
            setTimeout(() => {
                const item = document.createElement('div');
                item.className = 'data-item';
                item.innerHTML = `
                    <div class="data-header">
                        <span class="data-type">${signal.type}</span>
                        <span class="data-confidence">${Math.round(signal.confidence * 100)}%</span>
                    </div>
                    <div class="data-value">${signal.text}</div>
                `;
                signalsList.appendChild(item);
            }, index * 100);
        });
    }
    
    // Persona
    const personaInfo = document.getElementById('personaInfo');
    if (persona) {
        personaInfo.innerHTML = `
            <div class="data-item">
                <div class="data-header">
                    <span class="data-type">Persona: ${persona.name}</span>
                    <span class="data-confidence">Age: ${persona.age}</span>
                </div>
                <div class="data-value">
                    <strong>Background:</strong> ${persona.background}<br>
                    <strong>Communication Style:</strong> ${persona.communicationStyle}<br>
                    <strong>Vulnerability Level:</strong> ${persona.vulnerabilityLevel}/10<br>
                    <strong>Tech Savvy:</strong> ${persona.characteristics.techSavvy}/10
                </div>
            </div>
        `;
    }
    
    // Show results
    document.getElementById('resultsSection').style.display = 'block';
    setTimeout(() => {
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
}

function clearQuickAnalyze() {
    document.getElementById('analyzeInput').value = '';
    document.getElementById('resultsSection').style.display = 'none';
}

// Live Conversation
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!currentConversationId) {
        await startConversation(message);
    } else {
        await continueConversation(message);
    }
    
    input.value = '';
}

async function startConversation(message) {
    showLoading();
    
    try {
        const response = await fetch(`${API_URL}/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({ initialMessage: message })
        });
        
        if (!response.ok) throw new Error('API Error');
        
        const data = await response.json();
        currentConversationId = data.conversationId;
        
        addMessage('user', message);
        document.getElementById('chatStatus').textContent = 'Active';
        
        await updateConversationMetrics();
        
    } catch (error) {
        showToast('Failed to start conversation', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

async function continueConversation(message) {
    showLoading();
    
    try {
        const response = await fetch(`${API_URL}/conversations/${currentConversationId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) throw new Error('API Error');
        
        const data = await response.json();
        
        addMessage('user', message);
        
        setTimeout(() => {
            addMessage('agent', data.content);
        }, data.delay || 1000);
        
        await updateConversationMetrics();
        
    } catch (error) {
        showToast('Failed to send message', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

function addMessage(type, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <div>${content}</div>
        <div class="message-meta">${new Date().toLocaleTimeString()}</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function updateConversationMetrics() {
    if (!currentConversationId) return;
    
    try {
        const response = await fetch(`${API_URL}/conversations/${currentConversationId}`, {
            headers: { 'X-API-Key': API_KEY }
        });
        
        if (!response.ok) throw new Error('API Error');
        
        const data = await response.json();
        
        document.getElementById('convState').textContent = data.state;
        
        const riskScore = data.riskScore || 0;
        document.getElementById('convRisk').textContent = Math.round(riskScore) + '%';
        document.getElementById('convRiskBar').style.width = riskScore + '%';
        
        document.getElementById('convMessages').textContent = data.messages.length;
        document.getElementById('convEntities').textContent = data.extractedEntities.length;
        document.getElementById('convSignals').textContent = data.scamSignals.length;
        
    } catch (error) {
        console.error('Failed to update metrics:', error);
    }
}

async function terminateConversation() {
    if (!currentConversationId) return;
    
    try {
        await fetch(`${API_URL}/conversations/${currentConversationId}`, {
            method: 'DELETE',
            headers: { 'X-API-Key': API_KEY }
        });
        
        showToast('Conversation terminated', 'success');
        currentConversationId = null;
        document.getElementById('chatMessages').innerHTML = '';
        document.getElementById('chatStatus').textContent = 'Ready';
        document.getElementById('convState').textContent = 'Idle';
        document.getElementById('convRisk').textContent = '0%';
        document.getElementById('convRiskBar').style.width = '0%';
        document.getElementById('convMessages').textContent = '0';
        document.getElementById('convEntities').textContent = '0';
        document.getElementById('convSignals').textContent = '0';
        
    } catch (error) {
        showToast('Failed to terminate conversation', 'error');
        console.error(error);
    }
}

// Dashboard
function updateDashboard() {
    document.getElementById('dashScans').textContent = stats.totalScans;
    document.getElementById('dashThreats').textContent = stats.threatsDetected;
    
    // Threat Chart
    const chartContainer = document.getElementById('threatChart');
    chartContainer.innerHTML = '';
    
    const types = Object.entries(stats.scamTypes);
    if (types.length === 0) {
        chartContainer.innerHTML = '<div class="empty-state">No data available yet</div>';
        return;
    }
    
    const total = types.reduce((sum, [, count]) => sum + count, 0);
    
    types.forEach(([type, count], index) => {
        const percentage = (count / total * 100).toFixed(1);
        setTimeout(() => {
            const bar = document.createElement('div');
            bar.className = 'chart-bar-item';
            bar.innerHTML = `
                <div class="chart-bar-label">${type}</div>
                <div class="chart-bar-wrapper">
                    <div class="chart-bar-fill" style="width: 0%">${count} (${percentage}%)</div>
                </div>
            `;
            chartContainer.appendChild(bar);
            
            setTimeout(() => {
                bar.querySelector('.chart-bar-fill').style.width = percentage + '%';
            }, 100);
        }, index * 200);
    });
}

function updateStats(data) {
    stats.totalScans++;
    
    if (data.riskScore >= 70) {
        stats.threatsDetected++;
    }
    
    if (data.classification) {
        const type = data.classification.primaryType;
        stats.scamTypes[type] = (stats.scamTypes[type] || 0) + 1;
    }
    
    saveStats();
    loadStats();
    updateDashboard();
}

function loadStats() {
    const saved = localStorage.getItem('scamStats');
    if (saved) {
        stats = JSON.parse(saved);
    }
    
    document.getElementById('heroScans').textContent = stats.totalScans;
    document.getElementById('heroThreats').textContent = stats.threatsDetected;
}

function saveStats() {
    localStorage.setItem('scamStats', JSON.stringify(stats));
}

// UI Helpers
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        const analyzeInput = document.getElementById('analyzeInput');
        if (document.activeElement === analyzeInput) {
            quickAnalyze();
        }
    }
});

// Chat input enter key
document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Auto-update conversation metrics
setInterval(() => {
    if (currentConversationId) {
        updateConversationMetrics();
    }
}, 5000);

// ============================================
// ENHANCED FEATURES
// ============================================

// Sound Effects
const sounds = {
    success: new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6OyrWBQLSKHe8sFuIwUrgc7y2Yk2CBhkuezooVARDEyl4fG5ZRwFNo3V7859KQUofsz'),
    error: new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6OyrWBQLSKHe8sFuIwUrgc7y2Yk2CBhkuezooVARDEyl4fG5ZRwFNo3V7859KQUofsz'),
    alert: new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6OyrWBQLSKHe8sFuIwUrgc7y2Yk2CBhkuezooVARDEyl4fG5ZRwFNo3V7859KQUofsz')
};

function playSound(type) {
    try {
        sounds[type].currentTime = 0;
        sounds[type].play().catch(e => console.log('Sound play failed:', e));
    } catch (e) {
        console.log('Sound not available');
    }
}

// Loading Tips
const loadingTips = [
    "💡 Never share personal information with unknown contacts",
    "🔒 Always verify sender identity before clicking links",
    "⚠️ Be suspicious of urgent requests for money",
    "🎯 Scammers often impersonate trusted organizations",
    "�� Check email addresses carefully for misspellings",
    "💰 If it sounds too good to be true, it probably is",
    "🔍 Research companies before making investments",
    "📱 Enable two-factor authentication on all accounts",
    "🚫 Never send money to someone you haven't met",
    "✅ Trust your instincts - if something feels off, it probably is"
];

let tipInterval;

function showLoadingWithTips() {
    document.getElementById('loadingOverlay').classList.add('show');
    const tipElement = document.getElementById('loadingTip');
    
    // Show random tip immediately
    tipElement.textContent = loadingTips[Math.floor(Math.random() * loadingTips.length)];
    
    // Rotate tips every 2 seconds
    tipInterval = setInterval(() => {
        tipElement.style.animation = 'none';
        setTimeout(() => {
            tipElement.textContent = loadingTips[Math.floor(Math.random() * loadingTips.length)];
            tipElement.style.animation = 'fadeIn 0.5s ease';
        }, 50);
    }, 2000);
}

function hideLoadingWithTips() {
    document.getElementById('loadingOverlay').classList.remove('show');
    if (tipInterval) {
        clearInterval(tipInterval);
    }
}

// Recent Scans History
let recentScans = JSON.parse(localStorage.getItem('recentScans') || '[]');

function addToRecentScans(data, message) {
    const scan = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        message: message.substring(0, 100),
        riskScore: data.riskScore,
        classification: data.classification?.primaryType || 'unknown',
        data: data
    };
    
    recentScans.unshift(scan);
    recentScans = recentScans.slice(0, 5); // Keep only last 5
    localStorage.setItem('recentScans', JSON.stringify(recentScans));
    updateRecentScansPanel();
}

function updateRecentScansPanel() {
    const panel = document.getElementById('recentScansList');
    
    if (recentScans.length === 0) {
        panel.innerHTML = '<div class="empty-state">No recent scans</div>';
        return;
    }
    
    panel.innerHTML = recentScans.map(scan => {
        const riskColor = scan.riskScore >= 70 ? 'var(--danger)' : 
                         scan.riskScore >= 40 ? 'var(--warning)' : 'var(--success)';
        const timeAgo = getTimeAgo(new Date(scan.timestamp));
        
        return `
            <div class="recent-scan-item" onclick="loadRecentScan(${scan.id})" style="border-left-color: ${riskColor}">
                <div class="recent-scan-header">
                    <span class="recent-scan-risk" style="color: ${riskColor}">${Math.round(scan.riskScore)}</span>
                    <span class="recent-scan-time">${timeAgo}</span>
                </div>
                <div class="recent-scan-preview">${scan.message}</div>
            </div>
        `;
    }).join('');
}

function loadRecentScan(id) {
    const scan = recentScans.find(s => s.id === id);
    if (scan) {
        document.getElementById('analyzeInput').value = scan.message;
        displayResults(scan.data);
        scrollToAnalyzer();
        toggleRecentScans();
    }
}

function toggleRecentScans() {
    document.getElementById('recentScansPanel').classList.toggle('open');
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const icon = document.getElementById('themeIcon');
    const isLight = document.body.classList.contains('light-theme');
    icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    playSound('success');
}

function loadTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('themeIcon').className = 'fas fa-sun';
    }
}

// Keyboard Shortcuts
function showShortcuts() {
    document.getElementById('shortcutsModal').classList.add('show');
}

function closeShortcuts() {
    document.getElementById('shortcutsModal').classList.remove('show');
}

document.addEventListener('keydown', (e) => {
    // ? - Show shortcuts
    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        showShortcuts();
    }
    
    // Escape - Close modals
    if (e.key === 'Escape') {
        closeShortcuts();
    }
    
    // Ctrl+K - Clear input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        clearQuickAnalyze();
    }
    
    // Ctrl+S - Share
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        shareAnalysis();
    }
    
    // T - Toggle theme
    if (e.key === 't' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
        toggleTheme();
    }
});

// Share Analysis
function shareAnalysis() {
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection.style.display === 'none') {
        showToast('No analysis to share', 'error');
        return;
    }
    
    const score = document.getElementById('threatScore').textContent;
    const type = document.getElementById('threatType').textContent;
    const url = window.location.href;
    
    const shareText = `🛡️ Scam Analysis Result\n\nRisk Score: ${score}\n${type}\n\nAnalyzed with Scam Intelligence System\n${url}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Scam Analysis Result',
            text: shareText
        }).then(() => {
            showToast('Shared successfully!', 'success');
            playSound('success');
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('Analysis copied to clipboard!', 'success');
            playSound('success');
        });
    }
}

// Performance Tracking
let analysisStartTime;

function startPerformanceTracking() {
    analysisStartTime = performance.now();
}

function endPerformanceTracking() {
    if (analysisStartTime) {
        const duration = ((performance.now() - analysisStartTime) / 1000).toFixed(2);
        document.getElementById('analysisTime').textContent = duration + 's';
        analysisStartTime = null;
    }
}

// Initialize new features
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    updateRecentScansPanel();
});

