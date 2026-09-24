const fs = require('fs');
const crypto = require('crypto');
const { getAllFiles } = require('./FileWalker');

// Алгоритм шифрования - AES-256 в режиме GCM.
// GCM хорош тем, что сам проверяет, правильный ли пароль был использован
// при расшифровке (если неправильный - выдаст ошибку, а не "мусор").
const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 16; // байт, соль для получения ключа из пароля
const IV_LENGTH = 12;   // байт, вектор инициализации, чтобы шифрование одинаковых данных не давало одинаковый результат
const TAG_LENGTH = 16;  // байт, тег для проверки пароля (GCM auth tag), который генерирует GCM -  по нему при расшифровке можно понять, правильный был пароль или нет
const KEY_LENGTH = 32;  // Длина ключа шифрования в байтах: 32*8 = 256 бит

// "Метка", которую мы добавляем в начало зашифрованного файла.
// По ней программа узнаёт, что файл уже зашифрован именно ею -
// имя и расширение файла при этом никак не меняются, снаружи файл выглядит точно так же, как и раньше
const MAGIC = Buffer.from('FCJS');
const MAGIC_LENGTH = MAGIC.length;

let instance = null; //Переменная, в которой будет храниться единственный экземпляр класса

// CryptoManager - класс для шифрования и дешифрования файлов.
class CryptoManager {
  constructor() {
    if (instance) {
      // экземпляр уже был создан раньше - возвращаем его
      return instance;
    }
    instance = this;
  }

  static getInstance() {
    if (!instance) {
      instance = new CryptoManager();
    }
    return instance;
  }

  // Получаем ключ шифрования (256 бит) из пароля и соли.
  // Пароль нигде не хранится, ключ каждый раз считается заново.
  getKey(password, salt) {
    return crypto.scryptSync(password, salt, KEY_LENGTH);
  }

  // Проверяем по первым байтам файла, зашифрован ли он уже нами.
  isEncrypted(filePath) {
    const data = fs.readFileSync(filePath);
    const header = data.subarray(0, MAGIC_LENGTH);
    return header.equals(MAGIC);
  }

  // Шифрование одного файла
  encryptFile(filePath, password) {
    const data = fs.readFileSync(filePath);

    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = this.getKey(password, salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Записываем метку +соль + iv + тег + зашифрованные данные в один файл
    // Соль и iv не секретны, их можно хранить открыто
    const result = Buffer.concat([MAGIC, salt, iv, authTag, encrypted]);
    fs.writeFileSync(filePath, result);
  }

  // Дешифрование одного файла
  decryptFile(filePath, password) {
    const data = fs.readFileSync(filePath);

    const salt = data.subarray(MAGIC_LENGTH, MAGIC_LENGTH + SALT_LENGTH);
    const iv = data.subarray(MAGIC_LENGTH + SALT_LENGTH, MAGIC_LENGTH + SALT_LENGTH + IV_LENGTH);
    const authTag = data.subarray(MAGIC_LENGTH + SALT_LENGTH + IV_LENGTH, MAGIC_LENGTH + SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(MAGIC_LENGTH + SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = this.getKey(password, salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag); // если пароль неверный, следующая строка выбросит ошибку

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    fs.writeFileSync(filePath, decrypted);
  }

  // Шифрование всех файлов в папке и всех вложенных подпапках
  encryptFolder(folderPath, password) {
    const files = getAllFiles(folderPath);
    let count = 0;

    for (const file of files) {
      if (this.isEncrypted(file)) {
        continue; // файл уже зашифрован, пропускаем
      }
      try {
        this.encryptFile(file, password);
        console.log('Зашифрован:', file);
        count++;
      } catch (err) {
        console.log('Не удалось зашифровать файл', file, '-', err.message);
      }
    }

    return count;
  }

  // Дешифрование всех файлов (*.enc) в папке и всех вложенных подпапках
  decryptFolder(folderPath, password) {
    const files = getAllFiles(folderPath);
    let count = 0;

    for (const file of files) {
      if (!this.isEncrypted(file)) {
        continue; // не зашифрованный файл, пропускаем
      }
      try {
        this.decryptFile(file, password);
        console.log('Расшифрован:', file);
        count++;
      } catch (err) {
        console.log('Не удалось расшифровать файл', file, '- возможно, неверный пароль');
      }
    }

    return count;
  }
}

module.exports = CryptoManager;
