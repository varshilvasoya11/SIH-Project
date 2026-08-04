// ==============================================
// AI Provider Factory — Grok / Gemini switchable
// ==============================================

function getAIProvider() {
  const provider = process.env.AI_PROVIDER || 'gemini';

  if (provider === 'grok') {
    return new GrokProvider();
  }
  return new GeminiProvider();
}

// ── Gemini Provider ──────────────────────────
class GeminiProvider {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  async generate(prompt) {
    if (!this.apiKey) {
      return this._mockResponse(prompt);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI';
    } catch (err) {
      console.error('Gemini API error:', err.message);
      return this._mockResponse(prompt);
    }
  }

  async chat(systemPrompt, history, message) {
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'I understand. I will help assess the patient\'s symptoms.' }] },
    ];

    for (const msg of history) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    if (!this.apiKey) {
      return this._mockChatResponse(message);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        }
      );

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Any other symptoms and any other illness?';
    } catch (err) {
      console.error('Gemini Chat error:', err.message);
      return this._mockChatResponse(message);
    }
  }

  _mockResponse(prompt) {
    if (prompt.includes('triage') || prompt.includes('Triage')) {
      return JSON.stringify({
        emergencyScore: Math.floor(Math.random() * 5) + 3,
        estimatedWaitMinutes: Math.floor(Math.random() * 20) + 5,
        reasoning: 'Based on reported symptoms, moderate priority recommended.',
        recommendedAction: 'routine',
        possibleConditions: ['Common cold', 'Seasonal flu'],
      });
    }
    if (prompt.includes('Translate')) {
      return 'Translation: ' + prompt.split('\n\n').pop();
    }
    return 'AI response (demo mode - no API key configured)';
  }

  _mockChatResponse(message) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('fever') || lowerMsg.includes('temperature')) {
      return 'I see you have a fever. How high is your temperature? Do you have any other symptoms or any other illness?';
    }
    if (lowerMsg.includes('headache') || lowerMsg.includes('head pain')) {
      return 'I understand you have a headache. On a scale of 1 to 10, how severe is the pain? Do you have any other symptoms or any other illness?';
    }
    if (lowerMsg.includes('cough') || lowerMsg.includes('cold')) {
      return 'You mentioned a cough. Is it a dry cough or do you have phlegm? Do you have any other symptoms or any other illness?';
    }
    if (lowerMsg.includes('stomach') || lowerMsg.includes('vomit')) {
      return 'Stomach issues noted. Have you eaten anything unusual recently? Do you have any other symptoms or any other illness?';
    }
    if (lowerMsg.includes('chest') || lowerMsg.includes('breathing')) {
      return '⚠️ EMERGENCY FLAG: Chest/breathing issues detected. This could be urgent. I\'m marking your case as high priority. A doctor will see you as soon as possible.';
    }
    return 'Any other symptoms and any other illness?';
  }
}

// ── Grok Provider ────────────────────────────
class GrokProvider {
  constructor() {
    this.apiKey = process.env.GROK_API_KEY;
    this.model = process.env.GROK_MODEL || 'grok-3';
    this.baseUrl = 'https://api.x.ai/v1';
  }

  async generate(prompt) {
    if (!this.apiKey) {
      // Fallback to Gemini mock
      return new GeminiProvider()._mockResponse(prompt);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response from AI';
    } catch (err) {
      console.error('Grok API error:', err.message);
      return new GeminiProvider()._mockResponse(prompt);
    }
  }

  async chat(systemPrompt, history, message) {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    if (!this.apiKey) {
      return new GeminiProvider()._mockChatResponse(message);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.5,
        }),
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Any other symptoms and any other illness?';
    } catch (err) {
      console.error('Grok Chat error:', err.message);
      return new GeminiProvider()._mockChatResponse(message);
    }
  }
}

module.exports = { getAIProvider, GeminiProvider, GrokProvider };
