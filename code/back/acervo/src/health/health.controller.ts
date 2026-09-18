import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService } from '@nestjs/terminus';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DrizzleHealthIndicator } from './drizzle.health';
import { Publico } from '../auth/publico.decorator';

/**
 * `GET /health` (RNF-OBS-02): 200 quando o serviço está de pé e o banco
 * responde. Se o banco cair, `health.check` lança e o corpo de erro padrão
 * (503) é devolvido pelo AllExceptionsFilter.
 */
@Publico()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DrizzleHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Serviço e banco saudáveis.',
    schema: {
      example: {
        status: 'ok',
        service: 'acervo',
        time: '2026-08-25T12:00:00.000Z',
      },
    },
  })
  async check(): Promise<{ status: string; service: string; time: string }> {
    await this.health.check([() => this.db.isHealthy('database')]);
    return {
      status: 'ok',
      service: this.config.get<string>('SERVICE_NAME') ?? 'acervo',
      time: new Date().toISOString(),
    };
  }
}
