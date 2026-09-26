"""Carga inicial da base oficial do Lê Ai a partir do data dump do OpenLibrary.

Implementa RF-ACV-13 (carga inicial com normalização, RN-12) e RF-ACV-20
(associação de assuntos normalizados, RN-21) da feature F-ACV-INGESTAO.

O pacote é dividido entre **lógica pura** (`isbn`, `normalizacao`, `assuntos`,
`filtros`, `dump`) e **acesso a banco** (`carga`, `execucao`). Só a segunda
metade importa `psycopg`, que é um extra opcional — é o que permite rodar toda
a suíte de testes sem banco e sem libpq.
"""

__all__ = ["isbn", "normalizacao", "assuntos", "filtros", "dump"]
