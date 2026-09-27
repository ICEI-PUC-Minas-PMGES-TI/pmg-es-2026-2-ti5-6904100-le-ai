import { SetMetadata } from '@nestjs/common';

export const PUBLICO = 'rota_publica';

/**
 * Libera a rota do guard global de autenticação.
 *
 * O guard é global de propósito: rota nova nasce protegida, e esquecer o
 * decorator resulta em 401, não em vazamento. Só `/health` é público —
 * RNF-OBS-02 pede que ele responda sem credencial.
 */
export const Publico = () => SetMetadata(PUBLICO, true);
