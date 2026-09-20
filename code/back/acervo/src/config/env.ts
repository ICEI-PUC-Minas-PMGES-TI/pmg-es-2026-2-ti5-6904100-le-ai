import { z } from 'zod';

/**
 * Contrato das variáveis de ambiente do serviço. Validado no boot
 * (@nestjs/config `validate`) — o serviço não sobe com config inválida.
 * Segredos vêm só do ambiente, nunca do repositório (RNF-SEC-11).
 */
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    SERVICE_NAME: z.string().min(1).default('acervo'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    // Banco (obrigatório) — schema do próprio serviço via search_path na URL.
    DATABASE_URL: z.string().url(),
    DB_SCHEMA: z.string().min(1),

    // CORS restrito às origens conhecidas, sem curinga (RNF-SEC-21).
    CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

    // Integrações e segredos usados pelas features de domínio (opcionais no P0).
    AMQP_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    AMQP_URL: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    ADMIN_EMAIL: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
  })
  .superRefine((config, context) => {
    if (config.AMQP_ENABLED && !config.AMQP_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AMQP_URL'],
        message: 'AMQP_URL é obrigatória quando AMQP_ENABLED=true',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(
        (issue) => `  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`,
      )
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  return parsed.data;
}
