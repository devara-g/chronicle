import { createGroq } from '@ai-sdk/groq';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

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
      prompt: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
