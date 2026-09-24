const readline = require('readline');
const CryptoManager = require('./src/CryptoManager');
const { isForbidden } = require('./src/SafetyGuard');

function askPassword(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const command = process.argv[2];     // encrypt или decrypt
  const folderPath = process.argv[3];  // путь к папке
  let password = process.argv[4];      // пароль (необязательно)

  if (!command || !folderPath || (command !== 'encrypt' && command !== 'decrypt')) {
    console.log('Использование:');
    console.log('  node index.js encrypt <путь_к_папке> [пароль]');
    console.log('  node index.js decrypt <путь_к_папке> [пароль]');
    return;
  }

  if (isForbidden(folderPath)) {
    console.log('Эту папку трогать нельзя: это системная папка или папка самой программы.');
    return;
  }

  if (!password) {
    password = await askPassword('Введите пароль: ');
  }

  const cryptoManager = CryptoManager.getInstance();

  if (command === 'encrypt') {
    console.log('Шифрование папки:', folderPath);
    const count = cryptoManager.encryptFolder(folderPath, password);
    console.log('Готово. Зашифровано файлов:', count);
  } else {
    console.log('Дешифрование папки:', folderPath);
    const count = cryptoManager.decryptFolder(folderPath, password);
    console.log('Готово. Расшифровано файлов:', count);
  }
}

main();
