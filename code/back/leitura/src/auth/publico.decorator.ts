import { SetMetadata } from '@nestjs/common';

export const PUBLICO = 'rota_publica';

export const Publico = () => SetMetadata(PUBLICO, true);
