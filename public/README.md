# ScamShield UI - AI Honeypot Intelligence Platform

## Overview

This is the new, streamlined UI for the Scam Intelligence System. It features a clean, terminal-inspired design with real-time threat analysis.

## Features

### 🎯 Live Scammer Simulation Console
- Type messages as a scammer to test the AI honeypot
- 6 preset scam scenarios (IRS, Bank Fraud, Tech Support, Romance, Crypto, Lottery)
- Real-time conversation with AI agent responses

### 📊 Threat Assessment Panel
- Animated risk score meter (0-100)
- Color-coded risk levels (Low, Medium, High, Critical)
- Scam type classification with confidence scores

### 📡 Signal Detection
- Real-time detection of scam signals:
  - **URGENCY** - Time pressure tactics
  - **FINANCIAL_REQUEST** - Money/payment requests
  - **IMPERSONATION** - Authority figure impersonation
  - **THREAT** - Threatening language
- Each signal shows confidence percentage

### 🎯 Entity Extraction
- Automatically extracts and displays:
  - 📞 Phone numbers
  - 🔗 URLs
  - 💳 Payment IDs
  - ✉️ Email addresses
  - 🏢 Organizations
  - 🏦 Bank accounts

### 💻 Status Bar
- Live system status
- Message count
- Entity count
- Session ID tracking

## Design

- **Color Scheme**: Dark theme with cyan/teal accents (#00dbb4)
- **Typography**: 
  - Syne Mono (monospace, technical elements)
  - Syne (headings, bold text)
  - DM Sans (body text)
- **Layout**: 2-column grid (chat + intelligence panel)
- **Animations**: Smooth transitions, typing indicators, signal animations

## Backend Integration

The UI connects to the backend API at `/api/v1`:

- `POST /api/v1/conversations` - Start new conversation
- `POST /api/v1/conversations/:id/messages` - Send message
- `GET /api/v1/conversations/:id` - Get conversation details

### Fallback Mode

If the backend is unavailable, the UI includes local analysis that:
- Detects common scam patterns using regex
- Extracts entities from messages
- Calculates risk scores
- Generates realistic AI agent responses

## Usage

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Open browser**:
   ```
   http://localhost:3000
   ```

3. **Test with presets**:
   - Click any preset button (IRS, Bank Fraud, etc.)
   - Click "SEND ➤" to engage the AI honeypot
   - Watch real-time signal detection and entity extraction

4. **Custom messages**:
   - Type your own scam message in the input
   - Press Enter or click "SEND ➤"

5. **New session**:
   - Click "↺ NEW SESSION" to reset and start fresh

## Files

- `index.html` - Main HTML structure
- `styles.css` - All styling (embedded in HTML for portability)
- `app.js` - Frontend JavaScript logic (embedded in HTML)

## API Key

The UI uses a test API key: `test-api-key-12345`

For production, update the `API_KEY` constant in the JavaScript section.

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile: ✅ Responsive design

## Performance

- Lightweight: ~50KB total (HTML + CSS + JS)
- No external dependencies (except Google Fonts)
- Smooth 60fps animations
- Instant local fallback if backend unavailable

## Customization

### Change Colors

Edit CSS variables in `:root`:
```css
:root {
  --accent: #00dbb4;  /* Primary accent color */
  --danger: #ff4b6e;  /* Danger/scammer color */
  --warn: #f5a623;    /* Warning color */
}
```

### Add New Presets

Edit the `PRESETS` object in JavaScript:
```javascript
const PRESETS = {
  custom: "Your custom scam message here..."
};
```

Then add a button:
```html
<button class="preset-btn" onclick="usePreset('custom')">🎯 CUSTOM</button>
```

## Demo Tips

For hackathon demos:

1. **Start with IRS preset** - Shows urgency + impersonation
2. **Follow with Bank preset** - Shows financial request + URL extraction
3. **Try Crypto preset** - Shows payment ID extraction
4. **Show the risk meter** - Watch it animate to critical levels
5. **Point out signal detection** - Real-time badges appearing
6. **Highlight entity extraction** - Colored chips for different types

## Troubleshooting

**Backend not responding?**
- The UI will automatically fall back to local analysis
- You'll still see signals, entities, and risk scores
- Agent responses will be simulated

**Signals not appearing?**
- Check browser console for errors
- Verify backend is running on port 3000
- Try a preset message first

**Styling issues?**
- Clear browser cache
- Check that styles.css is loading
- Verify Google Fonts are accessible

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Export conversation as JSON/PDF
- [ ] Dark/light theme toggle
- [ ] Conversation history panel
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
