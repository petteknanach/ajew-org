export const prerender = false;

/**
 * POST /api/transcribe
 * Accepts audio, returns transcription via Whisper.
 * Set WHISPER_API_KEY and WHISPER_PROVIDER env vars to enable.
 * 
 * Supported providers: "groq" (recommended, free tier, good Hebrew)
 * Also: "openai", "replicate"
 */
export async function POST({ request }: { request: Request }) {
  const provider = import.meta.env.WHISPER_PROVIDER || 'groq';
  const apiKey = import.meta.env.WHISPER_API_KEY || import.meta.env.GROQ_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ 
      error: 'Transcription not configured. Set WHISPER_API_KEY in Vercel env.',
      transcribed_text: null
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const mode = formData.get('mode') as string || 'free_speech'; // free_speech | guided | notes
    const referenceText = formData.get('reference_text') as string || '';
    const language = formData.get('language') as string || 'he';

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), { 
        status: 400, headers: { 'Content-Type': 'application/json' } 
      });
    }

    let transcribedText = '';
    let confidence = 0;

    if (provider === 'groq') {
      const groqForm = new FormData();
      groqForm.append('file', audioFile);
      groqForm.append('model', 'whisper-large-v3');
      groqForm.append('language', language);
      groqForm.append('response_format', 'verbose_json');

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: groqForm,
      });

      if (!res.ok) {
        const err = await res.text();
        return new Response(JSON.stringify({ error: `Groq API error: ${err}` }), {
          status: 502, headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await res.json();
      transcribedText = data.text || '';
      confidence = data.segments 
        ? data.segments.reduce((acc: number, s: any) => acc + (s.avg_logprob || -1), 0) / data.segments.length
        : 0;
    } else if (provider === 'openai') {
      const openaiForm = new FormData();
      openaiForm.append('file', audioFile);
      openaiForm.append('model', 'whisper-1');
      openaiForm.append('language', language);

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: openaiForm,
      });

      if (!res.ok) {
        const err = await res.text();
        return new Response(JSON.stringify({ error: `OpenAI API error: ${err}` }), {
          status: 502, headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await res.json();
      transcribedText = data.text || '';
    } else {
      return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate XP
    const durationSeconds = Math.ceil((audioFile.size / 16000) * 2); // rough estimate for WAV
    const wordsSpoken = transcribedText.split(/\s+/).filter(w => w.length > 0).length;
    
    let xpEarned = 0;
    let accuracy = 0;
    let bonus = '';

    if (mode === 'free_speech' || mode === 'notes') {
      // 10 XP per minute spoken
      xpEarned = Math.round((durationSeconds / 60) * 10);
      // Bonus for substantial speech
      if (wordsSpoken > 20) xpEarned += 5;
      if (wordsSpoken > 50) xpEarned += 10;
    } else if (mode === 'guided' && referenceText) {
      // Guided mode: compare with reference text
      const refWords = referenceText.split(/\s+/).filter(w => w.length > 0);
      const spokenWords = transcribedText.split(/\s+/).filter(w => w.length > 0);
      
      // Simple word overlap accuracy
      const refSet = new Set(refWords.map(w => w.toLowerCase()));
      const matchedWords = spokenWords.filter(w => refSet.has(w.toLowerCase())).length;
      accuracy = refWords.length > 0 ? Math.round((matchedWords / refWords.length) * 100) : 0;
      
      xpEarned = Math.round((durationSeconds / 60) * 10);
      if (accuracy > 70) { xpEarned += 10; bonus = 'accuracy_bonus'; }
      if (accuracy > 85) { xpEarned += 20; bonus = 'high_accuracy'; }
      if (accuracy > 95) { xpEarned += 30; bonus = 'perfect'; }
    }

    return new Response(JSON.stringify({
      transcribed_text: transcribedText,
      confidence: Math.round(confidence * 100) / 100,
      duration_seconds: durationSeconds,
      words_spoken: wordsSpoken,
      accuracy_pct: accuracy,
      xp_earned: xpEarned,
      bonus: bonus,
      mode: mode,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Transcription failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
