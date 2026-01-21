import { z } from "zod";

// Helper to map `percentage` -> `rate` before validation so clients can send either
function mapPercentageToRate(val: any) {
  if (val && typeof val === 'object') {
    const o = { ...(val as any) };
    if (o.percentage != null && o.rate == null) {
      o.rate = o.percentage;
    }
    // remove alias to avoid confusion
    delete o.percentage;
    return o;
  }
  return val;
}

const StatutoryDeductionBase = z.object({
  name: z.string().min(1),
  rate: z.number().nonnegative(),
});

export const CreateStatutoryDeductionSchema = z.preprocess(mapPercentageToRate, StatutoryDeductionBase);
export type CreateStatutoryDeductionDto = z.infer<typeof CreateStatutoryDeductionSchema>;

export const UpdateStatutoryDeductionSchema = z.preprocess(mapPercentageToRate, StatutoryDeductionBase.partial());
export type UpdateStatutoryDeductionDto = z.infer<typeof UpdateStatutoryDeductionSchema>;

export const StatutoryDeductionResponseSchema = StatutoryDeductionBase.extend({ id: z.string() });
export type StatutoryDeductionResponseDto = z.infer<typeof StatutoryDeductionResponseSchema>;
