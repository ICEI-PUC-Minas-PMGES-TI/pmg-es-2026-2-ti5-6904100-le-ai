package br.com.leai.social.lista.model;

import java.time.Instant;
import java.util.UUID;

/** Uma lista no índice: contagem de livros ativos e, quando pedido, se contém um livro. */
public record ResumoDaLista(
    UUID id,
    String titulo,
    String descricao,
    long quantidadeLivros,
    Instant atualizadoEm,
    Boolean contemLivro) {}
