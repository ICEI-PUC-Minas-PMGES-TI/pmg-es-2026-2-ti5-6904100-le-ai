package br.com.leai.social.lista.model;

import java.time.Instant;
import java.util.UUID;

/**
 * Linha de {@code social.lista_item} com os dados atuais do livro.
 *
 * <p>{@code ordem} é a posição gravada, que conta também livros que ficaram inativos (livro
 * pessoal excluído pelo dono continua em {@code lista_item}). {@code posicao} é a que o leitor vê:
 * o lugar do item entre os livros ativos, sempre contínua a partir de 1. O contrato só expõe
 * {@code posicao}; {@code ordem} fica interna, para o cursor e para mover.
 */
public record ItemDaLista(
    UUID id,
    UUID listaId,
    int ordem,
    int posicao,
    Instant adicionadoEm,
    LivroDeReferencia livro) {}
