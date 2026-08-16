import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY is not configured in environment variables.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages } = await req.json();
    const groq = createGroq({ apiKey });

    // Format messages cleanly for LLM consumption
    const modelMessages = (messages || []).map((m: any) => {
      let content = m.content;
      if (!content && Array.isArray(m.parts)) {
        content = m.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('');
      }
      return {
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: content || '',
      };
    });

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: `Kamu adalah asisten AI untuk "Chronicle", sebuah platform microblog bergaya noir minimalis dengan tampilan glassmorphism.

Kepribadianmu:
- Santai, natural, dan friendly — seperti teman yang ngerti teknologi
- Gunakan Bahasa Indonesia yang kasual dan mengalir, bukan kaku atau formal
- Boleh sesekali pakai kata gaul atau singkatan yang wajar (misal: "sih", "nih", "deh", "btw", "fyi")
- Jangan terlalu panjang — jawab to the point tapi tetap berasa hangat
- Kalau diminta bantu nulis post, langsung kasih contohnya yang aesthetic

Tugasmu:
- Bantu user nulis post yang menarik dan aesthetic
- Sarankan hashtag yang relevan
- Jawab pertanyaan seputar platform Chronicle
- Ngobrol santai seputar topik yang user minta

Ingat: Chronicle itu platform microblog tercepat dan terindah. Kamu bagian dari vibe-nya.`,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
