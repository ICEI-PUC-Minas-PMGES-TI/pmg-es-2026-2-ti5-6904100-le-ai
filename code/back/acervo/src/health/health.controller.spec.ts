import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DrizzleHealthIndicator } from './drizzle.health';

describe('HealthController', () => {
  let controller: HealthController;
  const check = jest.fn();

  beforeEach(async () => {
    check.mockResolvedValue({ status: 'ok', details: {} });
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check } },
        {
          provide: DrizzleHealthIndicator,
          useValue: { isHealthy: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('acervo') },
        },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('retorna status ok com nome do serviço e timestamp ISO', async () => {
    const res = await controller.check();
    expect(res.status).toBe('ok');
    expect(res.service).toBe('acervo');
    expect(() => new Date(res.time).toISOString()).not.toThrow();
    expect(check).toHaveBeenCalledTimes(1);
  });
});
