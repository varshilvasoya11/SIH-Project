// ==============================================
// AI Routes — Symptom chat, triage, translation
// ==============================================

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getAIProvider } = require('../services/aiProvider');
const router = express.Router();

// POST /api/ai/chat — AI symptom chatbot
router.post('/chat', authMiddleware, async (req, res, next) => {
  try {
    const { message, history, villagerName } = req.body;
    const provider = getAIProvider();

    const systemPrompt = `You are a healthcare assistant at a rural village KIOSK in India. 
You are talking to ${villagerName || 'a villager'}.
Your job is to ask about their symptoms, how long they've been sick, pain level (1-10), 
and any relevant medical history. Be gentle, simple, and clear. Always ask the patient: "Any other symptoms and any other illness?" 
Never say "Could you please repeat that?". Keep responses short (1-2 sentences max).
If the person mentions chest pain, difficulty breathing, or severe bleeding, 
immediately flag it as EMERGENCY in your response.`;

    const response = await provider.chat(systemPrompt, history || [], message);

    res.json({ reply: response });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/triage — AI triage scoring
router.post('/triage', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { consultationId, symptoms } = req.body;
    const provider = getAIProvider();

    // Get all waiting patients for context
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        villager: true,
        kiosk: true,
      },
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Get all other waiting patients
    const waitingQueue = await prisma.consultation.findMany({
      where: {
        kioskId: consultation.kioskId,
        status: { in: ['waiting', 'triaged'] },
        id: { not: consultationId },
      },
      include: { villager: true, triage: true },
    });

    const triagePrompt = `You are a medical triage AI. Analyze these symptoms and return a JSON response.
    
Patient: ${consultation.villager.name}
Medical History: ${JSON.stringify(consultation.villager.medicalHistory || {})}
Current Symptoms: ${JSON.stringify(symptoms)}

Other waiting patients: ${waitingQueue.length} people waiting.
${waitingQueue.map((w, i) => `  ${i + 1}. ${w.villager.name} - Priority: ${w.triage?.emergencyScore || 'not assessed'}`).join('\n')}

Return ONLY valid JSON:
{
  "emergencyScore": <1-10, 10 being most urgent>,
  "estimatedWaitMinutes": <number>,
  "reasoning": "<brief explanation>",
  "recommendedAction": "<immediate|urgent|routine|followup>",
  "possibleConditions": ["<condition1>", "<condition2>"]
}`;

    const response = await provider.generate(triagePrompt);

    let triageResult;
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      triageResult = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch {
      triageResult = {
        emergencyScore: 5,
        estimatedWaitMinutes: 15,
        reasoning: 'Unable to parse AI response, defaulting to medium priority',
        recommendedAction: 'routine',
      };
    }

    // Save triage result
    const triage = await prisma.aiTriage.upsert({
      where: { consultationId },
      update: {
        symptomsRaw: symptoms,
        aiAnalysis: triageResult,
        emergencyScore: triageResult.emergencyScore,
        estimatedWaitMinutes: triageResult.estimatedWaitMinutes,
        aiProvider: process.env.AI_PROVIDER || 'gemini',
      },
      create: {
        consultationId,
        symptomsRaw: symptoms,
        aiAnalysis: triageResult,
        emergencyScore: triageResult.emergencyScore,
        estimatedWaitMinutes: triageResult.estimatedWaitMinutes,
        aiProvider: process.env.AI_PROVIDER || 'gemini',
      },
    });

    // Update consultation priority
    await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        priorityScore: triageResult.emergencyScore,
        aiTriageResult: triageResult,
        status: 'triaged',
      },
    });

    // Notify queue about priority change
    const io = req.app.get('io');
    io.to(`queue-${consultation.kioskId}`).emit('queue-updated', { action: 'triaged', consultationId });

    res.json({ triage, triageResult });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/translate — Translate text
router.post('/translate', authMiddleware, async (req, res, next) => {
  try {
    const { text, from, to } = req.body;
    const provider = getAIProvider();

    const prompt = `Translate the following text from ${from || 'Hindi'} to ${to || 'English'}. Return ONLY the translation, nothing else:\n\n${text}`;
    const translation = await provider.generate(prompt);

    res.json({ translation: translation.trim() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
