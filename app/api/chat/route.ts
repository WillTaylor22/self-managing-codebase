import {
  convertToModelMessages,
  safeValidateUIMessages,
  streamText,
  tool,
  stepCountIs,
} from 'ai';
import { z } from 'zod';
import { travelPlanSchema } from '@/lib/travel-plan';
import { getSupabase } from '@/lib/supabase';

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an expert travel planner.

Your job: collaborate with the user to design a great trip. They will give you a destination and constraints (dates, budget, travelers, interests, dietary needs, mobility, etc.). Ask brief clarifying questions only when truly necessary — otherwise make reasonable assumptions and proceed.

When you have enough to draft or revise the plan, call the \`updateTravelPlan\` tool with the FULL current plan (not a diff). Always include every day in the trip. After calling the tool, write a short message (2-4 sentences) summarizing what changed and asking what to adjust.

Style: warm, concise, specific. Recommend real neighborhoods, dishes, and venues when you can. Acknowledge uncertainty rather than inventing facts.`;

// Envelope validation. `messages` is checked with safeValidateUIMessages
// (the AI SDK's canonical UIMessage validator) immediately below — keeping
// the zod schema deliberately loose here avoids duplicating that contract.
const ChatBody = z.object({
  messages: z.unknown(),
  sessionId: z.string().optional(),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const envelope = ChatBody.safeParse(raw);
  if (!envelope.success) {
    return Response.json(
      { error: 'invalid_body', issues: envelope.error.issues },
      { status: 400 },
    );
  }

  const validation = await safeValidateUIMessages({ messages: envelope.data.messages });
  if (!validation.success) {
    return Response.json(
      { error: 'invalid_messages', detail: validation.error.message },
      { status: 400 },
    );
  }

  const messages = validation.data;
  const { sessionId } = envelope.data;

  const result = streamText({
    model: 'anthropic/claude-sonnet-4-6',
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      updateTravelPlan: tool({
        description:
          'Create or fully replace the current travel plan. Pass the COMPLETE plan, not a diff. Call this whenever the plan should change.',
        inputSchema: travelPlanSchema,
        execute: async (plan) => {
          const supabase = getSupabase();
          if (supabase && sessionId) {
            await supabase
              .from('travel_plans')
              .upsert({ session_id: sessionId, plan, updated_at: new Date().toISOString() })
              .select();
          }
          return { ok: true as const, savedAt: new Date().toISOString() };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}

export const runtime = 'nodejs';
