import { z } from 'zod';

export const envValidationSchema = z.object({
  PORT: z.number().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});
