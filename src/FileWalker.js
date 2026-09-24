const fs = require('fs');
const path = require('path');

/**
 * Рекурсивно обходит папку и все вложенные подпапки.
 * Функция вызывает саму себя для каждой найденной подпапки 
 *
 * @param {string} dirPath - папка, которую обходим
 * @param {string[]} filesList - сюда собираем найденные файлы (накопитель)
 * @returns {string[]} список путей ко всем файлам внутри dirPath
 */
function getAllFiles(dirPath, filesList = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // это подпапка - заходим в неё рекурсивно
      getAllFiles(fullPath, filesList);
    } else if (entry.isFile()) {
      filesList.push(fullPath);
    }
  }

  return filesList;
}

module.exports = { getAllFiles };
