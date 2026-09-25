import '../livros/capa.dart';
import 'perfil_service.dart';

/// Avatar do perfil (RF-SOC-01, RNF-SEC-20). Mesmo caminho da capa de livro pessoal: o app valida
/// pelos bytes (`validarCapa`), envia **direto ao Cloudinary** pelo preset unsigned
/// `leai_avatares`, e o `identidade` só recebe a URL e o `publicId`, sem nunca baixar a imagem.
/// Mesmas regras de `code/front/src/services/avatar.ts`.

/// `.../image/upload/v1790275088/avatares/k7utfksh0rem2pvjravn.png` tem o `publicId`
/// `avatares/k7utfksh0rem2pvjravn`. O servidor faz a mesma extração e recusa se não bater.
String? publicIdDaUrl(String url) {
  final caminho = Uri.tryParse(url)?.path;
  if (caminho == null) {
    return null;
  }
  final encontrado = RegExp(r'/image/upload/(?:v\d+/)?(.+)\.[A-Za-z]+$').firstMatch(caminho);
  return encontrado == null ? null : Uri.decodeComponent(encontrado.group(1)!);
}

/// Miniatura quadrada pela transformação por URL do Cloudinary, no dobro do lado exibido para
/// tela de alta densidade.
String miniaturaDoAvatar(String url, double lado) {
  final pixels = (lado * 2).round();
  return url.replaceFirst('/image/upload/', '/image/upload/c_fill,g_face,w_$pixels,h_$pixels/');
}

class FalhaNoEnvioDoAvatar implements Exception {
  const FalhaNoEnvioDoAvatar();

  String get mensagem => 'Não foi possível enviar a foto. Tente de novo.';
}

/// Quem sobe a foto. Interface para o teste não depender de rede.
abstract class EnviadorDeAvatar {
  Future<Avatar> enviar(ImagemEscolhida imagem);
}

/// Reaproveita o `EnviadorDeCapa` (o upload ao Cloudinary é o mesmo, só muda o preset) e deriva
/// o `publicId` da URL devolvida.
class EnviadorDeAvatarCloudinary implements EnviadorDeAvatar {
  final EnviadorDeCapa _enviador;

  EnviadorDeAvatarCloudinary(this._enviador);

  @override
  Future<Avatar> enviar(ImagemEscolhida imagem) async {
    final String url;
    try {
      url = await _enviador.enviar(imagem);
    } on Exception {
      throw const FalhaNoEnvioDoAvatar();
    }
    final publicId = publicIdDaUrl(url);
    if (publicId == null) {
      throw const FalhaNoEnvioDoAvatar();
    }
    return Avatar(url: url, publicId: publicId);
  }
}
