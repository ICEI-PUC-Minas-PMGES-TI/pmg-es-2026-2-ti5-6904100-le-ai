import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract interface class DispositivoPushStore {
  Future<String?> read();

  Future<void> write(String id);

  Future<void> delete();
}

class SecureDispositivoPushStore implements DispositivoPushStore {
  static const String _key = 'dispositivo_push_id';

  final FlutterSecureStorage storage;

  SecureDispositivoPushStore({FlutterSecureStorage? storage})
    : storage = storage ?? const FlutterSecureStorage();

  @override
  Future<String?> read() => storage.read(key: _key);

  @override
  Future<void> write(String id) => storage.write(key: _key, value: id);

  @override
  Future<void> delete() => storage.delete(key: _key);
}
