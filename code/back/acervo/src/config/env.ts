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
    AMQP_URL: z.string().optional(),

    // Mesmo segredo do `identidade`, que emite o token HS256 (F-ACV-CADASTRO).
    // Nimbus recusa chave HMAC-SHA256 com menos de 256 bits, então o emissor
    // falharia com segredo curto — recusar aqui também evita descobrir isso só
    // no primeiro login.
    JWT_SECRET: z.string().min(32).optional(),

    ADMIN_EMAIL: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),

    // Fontes externas do cadastro por ISBN. A URL é sempre construída pelo
    // servidor a partir desta allowlist — nunca recebida do usuário (RNF-SEC-38).
    FONTES_HOSTS_PERMITIDOS: z
      .string()
      .default('openlibrary.org,covers.openlibrary.org,www.googleapis.com'),
    FONTES_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    FONTES_LIMITE_RESPOSTA_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(1_048_576),
    GOOGLE_BOOKS_API_KEY: z.string().optional(),

    // Capa de livro pessoal: o upload vai direto do cliente ao Cloudinary e o
    // servidor só valida que a URL aponta para o nosso próprio serviço (SEC-20).
    CLOUDINARY_CLOUD_NAME: z.string().default('leai'),
    CAPA_HOSTS_PERMITIDOS: z.string().default('res.cloudinary.com'),
  })
  .superRefine((config, ctx) => {
    // Em produção, subir sem `JWT_SECRET` significaria um serviço no ar em que
    // toda rota autenticada responde 401 — pior que não subir, porque o health
    // fica verde e o problema só aparece para o usuário.
    if (config.NODE_ENV === 'production' && !config.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message:
          'obrigatório em produção — precisa ser o mesmo segredo do serviço identidade',
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
