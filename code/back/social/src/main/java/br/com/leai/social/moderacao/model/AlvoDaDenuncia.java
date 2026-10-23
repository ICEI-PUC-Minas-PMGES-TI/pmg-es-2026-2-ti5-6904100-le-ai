package br.com.leai.social.moderacao.model;

import java.util.UUID;

/**
 * Conteúdo denunciado, já com o contexto que a denúncia grava na criação: o autor (para a
 * anonimização de RN-23.7), o livro e a atividade (para o painel e para fechar as denúncias dos
 * comentários quando a atividade some). {@code atividadeId} é nulo numa resenha sem atividade.
 */
public record AlvoDaDenuncia(
    String tipo, UUID id, UUID autorId, UUID livroId, UUID atividadeId, UUID atividadeAutorId) {}
