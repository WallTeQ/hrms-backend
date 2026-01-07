import { z } from "zod";

export const CreateOfferSchema = z.object({
  applicationId: z.string().uuid(),
  salary: z.number().nonnegative(),
});
export type CreateOfferDto = z.infer<typeof CreateOfferSchema>;

export const UpdateOfferSchema = CreateOfferSchema.partial();
export type UpdateOfferDto = z.infer<typeof UpdateOfferSchema>;

export const OfferResponseSchema = CreateOfferSchema.extend({ id: z.string(), accepted: z.boolean().optional().default(false), createdAt: z.string() });
export type OfferResponseDto = z.infer<typeof OfferResponseSchema>;
