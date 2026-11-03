import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { type SQL, ilike, or } from 'drizzle-orm';
import { vLivroReferencia } from '../db/contratos-externos';

export const BUSCA_TAMANHO_MAXIMO = 100;

export function CampoDeBusca(descricao: string): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional({
      description: descricao,
      maxLength: BUSCA_TAMANHO_MAXIMO,
    }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() || undefined : value,
    ),
    IsOptional(),
    IsString({ message: 'Informe um texto de busca.' }),
    MaxLength(BUSCA_TAMANHO_MAXIMO, {
      message: `A busca aceita até ${BUSCA_TAMANHO_MAXIMO} caracteres.`,
    }),
  );
}

export function padraoQueContem(termo: string): string {
  return `%${termo.replace(/[\\%_]/g, (caractere) => `\\${caractere}`)}%`;
}

export function tituloOuAutorContem(termo: string): SQL | undefined {
  const padrao = padraoQueContem(termo);
  return or(
    ilike(vLivroReferencia.titulo, padrao),
    ilike(vLivroReferencia.autorExibicao, padrao),
  );
}
