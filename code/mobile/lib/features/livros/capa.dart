import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

import 'formatos.dart';

/// Capa de livro pessoal (RN-14.7, RNF-SEC-20): o dono escolhe a imagem, o app valida e envia
/// **direto ao Cloudinary**, e o `acervo` só recebe a URL. O servidor nunca baixa a imagem; ele
/// confere host, caminho e extensão. Tipo real, tamanho e dimensões são conferidos aqui, para a
/// mensagem certa aparecer antes de gastar o upload, e de novo pelo preset do Cloudinary.

const int limiteDaCapaEmBytes = 5 * 1024 * 1024;
const int ladoMinimoDaCapa = 100;
const int ladoMaximoDaCapa = 6000;

class ImagemEscolhida {
  final Uint8List bytes;
  final String nome;

  const ImagemEscolhida({required this.bytes, required this.nome});
}

/// Quem abre a galeria. Interface para o teste não depender do plugin nativo.
abstract class SeletorDeImagem {
  Future<ImagemEscolhida?> escolher();
}

class SeletorDaGaleria implements SeletorDeImagem {
  final ImagePicker _picker;

  SeletorDaGaleria([ImagePicker? picker]) : _picker = picker ?? ImagePicker();

  @override
  Future<ImagemEscolhida?> escolher() async {
    final arquivo = await _picker.pickImage(source: ImageSource.gallery);
    if (arquivo == null) {
      return null;
    }
    return ImagemEscolhida(bytes: await arquivo.readAsBytes(), nome: arquivo.name);
  }
}

/// Formato pelo conteúdo, não pela extensão do nome: renomear um `.exe` para `.jpg` não o
/// transforma em imagem.
String? formatoDaImagem(Uint8List bytes) {
  bool comeca(List<int> assinatura, [int deslocamento = 0]) {
    if (bytes.length < deslocamento + assinatura.length) {
      return false;
    }
    for (var i = 0; i < assinatura.length; i++) {
      if (bytes[deslocamento + i] != assinatura[i]) {
        return false;
      }
    }
    return true;
  }

  if (comeca(<int>[0xFF, 0xD8, 0xFF])) {
    return 'jpg';
  }
  if (comeca(<int>[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
    return 'png';
  }
  if (comeca(ascii.encode('RIFF')) && comeca(ascii.encode('WEBP'), 8)) {
    return 'webp';
  }
  return null;
}

/// Mensagem de recusa, ou `null` se a imagem pode subir. A ordem importa: formato e tamanho
/// saem dos bytes, sem decodificar; só a imagem que passou deles é decodificada para medir.
Future<String?> validarCapa(Uint8List bytes) async {
  if (formatoDaImagem(bytes) == null) {
    return 'Formato não aceito. Use JPG, PNG ou WEBP.';
  }
  if (bytes.length > limiteDaCapaEmBytes) {
    return 'Essa imagem tem ${formatarMegabytes(bytes.length)}. O limite é 5 MB.';
  }
  try {
    final buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
    final descritor = await ui.ImageDescriptor.encoded(buffer);
    final largura = descritor.width;
    final altura = descritor.height;
    descritor.dispose();
    buffer.dispose();
    final menor = largura < altura ? largura : altura;
    final maior = largura > altura ? largura : altura;
    if (menor < ladoMinimoDaCapa || maior > ladoMaximoDaCapa) {
      return 'A imagem precisa ter entre $ladoMinimoDaCapa e $ladoMaximoDaCapa pixels de lado.';
    }
  } on Exception {
    return 'Formato não aceito. Use JPG, PNG ou WEBP.';
  }
  return null;
}

class FalhaNoEnvioDaCapa implements Exception {
  const FalhaNoEnvioDaCapa();
}

/// Quem sobe a imagem e devolve a URL pública. Interface para o teste não depender de rede.
abstract class EnviadorDeCapa {
  /// [aoProgredir] recebe de 0 a 1 conforme os bytes saem.
  Future<String> enviar(
    ImagemEscolhida imagem, {
    void Function(double progresso)? aoProgredir,
  });
}

/// Upload **unsigned** para o Cloudinary, pelo preset configurado (P-09). Nenhum segredo vive no
/// app: o preset é público por natureza, e é ele que limita o que o Cloudinary aceita.
class EnviadorCloudinary implements EnviadorDeCapa {
  final String cloudName;
  final String uploadPreset;
  final http.Client _client;
  final Duration timeout;

  EnviadorCloudinary({
    required this.cloudName,
    required this.uploadPreset,
    http.Client? client,
    this.timeout = const Duration(seconds: 60),
  }) : _client = client ?? http.Client();

  @override
  Future<String> enviar(
    ImagemEscolhida imagem, {
    void Function(double progresso)? aoProgredir,
  }) async {
    if (cloudName.isEmpty || uploadPreset.isEmpty) {
      throw const FalhaNoEnvioDaCapa();
    }

    final multipart =
        http.MultipartRequest(
            'POST',
            Uri.https('api.cloudinary.com', '/v1_1/$cloudName/image/upload'),
          )
          ..fields['upload_preset'] = uploadPreset
          ..files.add(
            http.MultipartFile.fromBytes('file', imagem.bytes, filename: imagem.nome),
          );

    // `MultipartRequest` não informa progresso; o corpo é recontado aqui, pedaço a pedaço,
    // numa `StreamedRequest` com os mesmos cabeçalhos.
    final corpo = multipart.finalize();
    final total = multipart.contentLength;
    final requisicao = http.StreamedRequest('POST', multipart.url)
      ..headers.addAll(multipart.headers)
      ..contentLength = total;
    var enviados = 0;
    corpo.listen(
      (pedaco) {
        enviados += pedaco.length;
        aoProgredir?.call(total == 0 ? 1 : enviados / total);
        requisicao.sink.add(pedaco);
      },
      onDone: requisicao.sink.close,
      onError: (Object erro) => requisicao.sink.addError(erro),
      cancelOnError: true,
    );

    try {
      final resposta = await http.Response.fromStream(
        await _client.send(requisicao).timeout(timeout),
      );
      if (resposta.statusCode != 200) {
        throw const FalhaNoEnvioDaCapa();
      }
      final url = (jsonDecode(resposta.body) as Map<String, dynamic>)['secure_url'];
      if (url is! String || !url.startsWith('https://res.cloudinary.com/')) {
        throw const FalhaNoEnvioDaCapa();
      }
      return url;
    } on FalhaNoEnvioDaCapa {
      rethrow;
    } on Exception {
      throw const FalhaNoEnvioDaCapa();
    }
  }
}
