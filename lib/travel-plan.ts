import { z } from 'zod';

export const travelPlanSchema = z.object({
  destination: z.string().describe('Primary destination city/region'),
  summary: z.string().describe('1-2 sentence overview of the trip'),
  dates: z.string().optional().describe('Travel window or duration, e.g. "May 10-17, 2026" or "7 days"'),
  travelers: z.string().optional().describe('Who is going, e.g. "2 adults"'),
  budget: z.string().optional().describe('Approximate budget'),
  days: z.array(
    z.object({
      day: z.number().int().positive(),
      title: z.string().describe('Theme of the day, e.g. "Old Town & food tour"'),
      morning: z.string().optional(),
      afternoon: z.string().optional(),
      evening: z.string().optional(),
      lodging: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
  tips: z.array(z.string()).optional().describe('Practical tips: transit, packing, customs'),
});

export type TravelPlan = z.infer<typeof travelPlanSchema>;
