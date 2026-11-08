/// Massa dos assuntos do livro pessoal (F-ACV-OPC). Os ids não seguem a ordem alfabética dos
/// nomes, para os testes verem que o corpo ordena os ids e a tela ordena os nomes.
const idBiografia = '00000000-0000-4000-8000-000000000009';
const idCronica = '00000000-0000-4000-8000-000000000008';
const idFantasia = '00000000-0000-4000-8000-000000000007';
const idFiccaoLiteraria = '00000000-0000-4000-8000-000000000006';
const idHistoria = '00000000-0000-4000-8000-000000000005';
const idMemorias = '00000000-0000-4000-8000-000000000004';
const idPolitica = '00000000-0000-4000-8000-000000000003';
const idRomanceHistorico = '00000000-0000-4000-8000-000000000002';
const idSociologia = '00000000-0000-4000-8000-000000000001';

const Map<String, String> nomesDosAssuntos = <String, String>{
  idBiografia: 'Biografia',
  idCronica: 'Crônica',
  idFantasia: 'Fantasia',
  idFiccaoLiteraria: 'Ficção literária',
  idHistoria: 'História',
  idMemorias: 'Memórias',
  idPolitica: 'Política',
  idRomanceHistorico: 'Romance histórico',
  idSociologia: 'Sociologia',
};

Map<String, String> assuntoJson(String id) => <String, String>{
  'id': id,
  'nome': nomesDosAssuntos[id]!,
};

/// Corpo de `GET /assuntos` (`ListaAssuntos`), em ordem alfabética como o servidor devolve.
Map<String, Object> listaDeAssuntos() => <String, Object>{
  'itens': <Map<String, String>>[for (final id in nomesDosAssuntos.keys) assuntoJson(id)],
};
