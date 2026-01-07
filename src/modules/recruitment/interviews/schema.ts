import { z } from "zod";

export const CreateInterviewSchema = z.object({
  applicationId: z.string().uuid(),
  scheduledAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  interviewer: z.string().min(1),
});
export type CreateInterviewDto = z.infer<typeof CreateInterviewSchema>;

export const UpdateInterviewSchema = CreateInterviewSchema.partial();
export type UpdateInterviewDto = z.infer<typeof UpdateInterviewSchema>;

export const InterviewResponseSchema = CreateInterviewSchema.extend({ id: z.string(), result: z.string().optional().nullable() });
export type InterviewResponseDto = z.infer<typeof InterviewResponseSchema>;
