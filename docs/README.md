# Lê Ai

**Vicenzo Fonseca de Mello Souza**

**Renato Douglas Nascimento Silva de Oliveira**

**Henrique Moreira Gomes de Carvalho**

**Kayke Emanoel de Souza Santos**

**Ana Luiza de Freitas Rodrigues**

---

Professores:

**Prof. Leonardo Vilela Cardoso**

**Prof. Artur Martins Mol**

**Prof. João Paulo Carneiro Aramuni**

---

_Curso de Engenharia de Software, Campus Coração Eucarístico_

_Instituto de Informática e Ciências Exatas – Pontifícia Universidade de Minas Gerais (PUC MINAS), Belo Horizonte – MG – Brasil_

---

_**Resumo**. O Lê Ai é um aplicativo social de leitura, no modelo Skoob/Letterboxd, cujo objetivo é aumentar a adesão à leitura entre leitores brasileiros com 18 anos ou mais. O cadastro é permitido a partir dos 18 anos e o produto opera em pt-BR. A tese de produto é que o hábito de leitura se sustenta por três mecanismos — registro, meta e pertencimento — e o aplicativo entrega os três. O produto principal é um app mobile nativo em Flutter, acompanhado de uma aplicação web em Vue + Tailwind que cobre um subconjunto de funcionalidades. O backend adota arquitetura de microsserviços (Spring e NestJS) sobre PostgreSQL no Neon, com mensageria RabbitMQ para os fluxos assíncronos. Este documento reúne a visão de produto, os requisitos, a modelagem e a avaliação arquitetural do trabalho._

---

## SUMÁRIO

1. [Apresentação](1.apresentacao.md#apresentacao "Apresentação") <br />
   1.1. Problema <br />
   1.2. Objetivos do trabalho <br />
   1.3. Definições e Abreviaturas <br />

2. [Nosso Produto](2.nosso_produto.md#produto "Nosso Produto") <br />
   2.1. Visão do Produto <br />
   2.2. Nosso Produto <br />
   2.3. Personas <br />

3. [Requisitos](3.requisitos.md#requisitos "Requisitos") <br />
   3.1. Requisitos Funcionais <br />
   3.2. Requisitos Não-Funcionais <br />
   3.3. Restrições Arquiteturais <br />
   3.4. Mecanismos Arquiteturais <br />

4. [Modelagem e Projeto Arquitetural](4.modelagem.md#modelagem "Modelagem e Projeto Arquitetural") <br />
   4.1. Histórias de Usuário <br />
   4.2. Visão Lógica <br />
   4.3. Modelo de dados <br />

5. [Wireframes](5.wireframe.md#wireframes "Wireframes") <br />

6. [Avaliação Heurística](6.avaliacao_heuristica.md#avaliação-heurística "Avaliação Heurística") <br />

6.1. [Avaliação Heurística — Protótipos do Lê Ai](6.1.avaliacao_heuristica_leai.md#avaliação-heurística--protótipos-do-lê-ai "Avaliação Heurística dos protótipos do próprio produto") <br />

7. [Solução](7.solucao.md#solucao "Projeto da Solução") <br />

8. [Avaliação Arquitetura](8.avaliacao_arquitetura.md#avaliacao "Avaliação da Arquitetura") <br />
   8.1. Cenários <br />
   8.2. Avaliação <br />

[Ferramentas](#ferramentas "Ferramentas")<br />

<a name="ferramentas"></a>

# Ferramentas

| Ambiente              | Plataforma | Link de Acesso                                                             |
| --------------------- | ---------- | -------------------------------------------------------------------------- |
| Repositório de código | GitHub     | https://github.com/ICEI-PUC-Minas-PMGES-TI/pmg-es-2026-2-ti5-6904100-le-ai |
| Hospedagem do site    | Render     | https://leai-web.onrender.com                                              |
| Protótipo Interativo  | Claude Design | Bundles HTML planejados em `docs/design/`                                |
