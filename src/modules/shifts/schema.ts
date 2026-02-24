import { z } from "zod";

export const CreateShiftSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["STANDARD", "NIGHT", "ROTATIONAL", "FLEXIBLE"]),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  expectedHours: z.number().positive(),
  graceMinutes: z.number().int().min(0).optional().nullable(),
  earlyDepartureMinutes: z.number().int().min(0).optional().nullable(),
  punctualityApplies: z.boolean().optional().nullable(),
  isFlexible: z.boolean().optional().nullable(),
  active: z.boolean().optional().nullable(),
});
export type CreateShiftDto = z.infer<typeof CreateShiftSchema>;

export const UpdateShiftSchema = CreateShiftSchema.partial();
export type UpdateShiftDto = z.infer<typeof UpdateShiftSchema>;
