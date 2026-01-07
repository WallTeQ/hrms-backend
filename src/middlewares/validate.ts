import type { RequestHandler } from "express";
import { z } from "zod";

export function validate<T extends z.ZodType<any, any, any>>(schema: T): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Use z.treeifyError to format errors (recommended over deprecated .format())
      const formatted = z.treeifyError(result.error);
      return res.status(400).json({ error: formatted });
    }
    // replace body with parsed/validated data
    req.body = result.data;
    return next();
  };
}