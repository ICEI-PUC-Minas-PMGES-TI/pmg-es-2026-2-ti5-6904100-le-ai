<script setup lang="ts">
/**
 * Política de privacidade (RNF-SEC-42): dados coletados, finalidade, retenção e direitos, como
 * texto de interface navegável por leitor de tela, nunca PDF nem link externo
 * (configuracoes.md §4.4). Um lugar só para o texto: a tela empilhada do mobile e a coluna direita
 * das configurações na web usam este componente.
 *
 * **O conteúdo é o mock declarado do protótipo** (configuracoes.md §3). O texto final é entrega
 * do grupo e entra com a Etapa 13 de F-AUT, junto do versionamento e do acesso pelo cadastro.
 */
const VERSAO = 'Versão 1.0, de 15 de setembro de 2026'

const BLOCOS = [
  {
    titulo: 'Dados que coletamos',
    texto:
      'E-mail, nome de usuário, nome de exibição, data de nascimento, senha guardada apenas como hash, e o que você registra no aplicativo: livros, leituras, progresso, notas, resenhas, comentários e quem você segue. Avatar e capa de livro pessoal, quando você envia.',
  },
  {
    titulo: 'Para que usamos',
    texto:
      'Manter sua conta e sua sessão, montar sua estante e seu feed, mostrar seu perfil conforme a privacidade que você escolheu e enviar o e-mail de recuperação de senha. Não vendemos dados e não usamos seus dados para publicidade.',
  },
  {
    titulo: 'Por quanto tempo guardamos',
    texto:
      'Enquanto a conta existir. O token de recuperação de senha vale por 1 hora. Registros de acesso ficam por 6 meses.',
  },
  {
    titulo: 'Seus direitos',
    texto: 'Você pode acessar e corrigir seus dados pelo perfil, e pedir suporte pelo e-mail de contato do projeto.',
  },
] as const
</script>

<template>
  <article>
    <p class="text-caption text-grafite-suave">
      {{ VERSAO }}
    </p>
    <section
      v-for="bloco in BLOCOS"
      :key="bloco.titulo"
      class="mt-space-6"
    >
      <h2 class="text-title-sm text-tinta">
        {{ bloco.titulo }}
      </h2>
      <p class="mt-space-2 text-body text-grafite">
        {{ bloco.texto }}
      </p>
    </section>
  </article>
</template>
