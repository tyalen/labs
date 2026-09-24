const path = require('path');

// Папки, которые нельзя шифровать/дешифровать ни в коем случае -
// это системные папки Windows
const FORBIDDEN_FOLDERS = [
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
  '/etc',
  '/usr',
  '/bin',
  '/boot',
  '/System',
];

// Папка самого проекта - если её зашифровать, программа сломает сама себя.
const PROJECT_FOLDER = path.resolve(__dirname, '..');

// Проверяет, можно ли работать с указанной папкой.
// Возвращает true, если папку трогать нельзя.
function isForbidden(folderPath) {
  const target = path.resolve(folderPath);

  // папка самого проекта
  if (target === PROJECT_FOLDER) {
    return true;
  }

  // корень целого диска, например C:\ или / - шифровать всё сразу нельзя
  if (path.parse(target).root === target) {
    return true;
  }

  // одна из известных системных папок (или её подпапка)
  return FORBIDDEN_FOLDERS.some((forbidden) => {
    const resolved = path.resolve(forbidden);
    return target === resolved || target.startsWith(resolved + path.sep);
  });
}

module.exports = { isForbidden };
