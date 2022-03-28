const db = require('./db');
const {walk} = require('node-os-walk');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const fse = require('fs-extra');


const kanji = new Map();
const keyCache = new Set();
const output = [];

async function loadDb() {
  const data = await db.all('SELECT key, hanviet FROM kanji');
  for (let row of data) {
    const {key, hanviet} = row;
    const cache = new Set();
    let meaning = hanviet
      .split('#')
      .map(i => {
        return i
          .replace(/\(.*\)/g, '')
          .replace(/\[.*]/g, '')
          .replace(/<.*>/g, '')
          .replace(/\./g, '')
          .replace(/\s+/g, '');
      })
      .join(',')
      .split(',')
      .filter(i => {
        if (cache.has(i)) return false;
        cache.add(i);
        return true;
      })
      .join(',')
    ;
    kanji.set(key, meaning);
  }

  const rootPath = path.resolve(__dirname, './yomichanJsonInput/kanjidic_vietnamese');
  for await (const [root, dirs, files] of walk(rootPath)) {
    for (const file of files) {
      if (file.name.indexOf('kanji_bank') !== -1) {
        const filePath = path.resolve(root, file.name);
        const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        for (let d of rawData) {
          let [key, meaning] = d;
          if (kanji.has(key)) continue;
          meaning = meaning.replace(/\w+\d/gi, '');
          meaning = meaning.replace(/[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B/g, '');
          meaning = meaning.replace(/\s+/gi, '');
          if (!meaning) continue;
          kanji.set(key, meaning);
        }
      }
    }
  }
}

async function loadJson(pathName) {
  const rawData = JSON.parse(fs.readFileSync(pathName, 'utf-8'));
  for (let d of rawData) {
    const [key, hiragana, _2, _3, _4, _5, _6, _7] = d;
    if (keyCache.has(`${key}_${hiragana}`)) continue;
    const hanviet = [];
    for (let c of key) {
      if (kanji.has(c)) {
        hanviet.push(kanji.get(c));
      }
    }
    if (!hanviet[0]) continue;
    keyCache.add(`${key}_${hiragana}`);
    output.push([key, hiragana, _2, _3, _4, [hanviet.join('|')], _6, _7]);
  }
}

async function main() {
  await loadDb();
  const rootPath = path.resolve(__dirname, './yomichanJsonInput/jmdict_english');
  for await (const [root, dirs, files] of walk(rootPath)) {
    for (const file of files) {
      if (file.name.indexOf('term_bank') !== -1) {
        const filePath = path.resolve(root, file.name);
        await loadJson(filePath);
      }
    }
  }
  const indexPath = './output/hanviet/index.json';
  const termPath = './output/hanviet/term_bank_1.json';
  const tagPath = './yomichanJsonInput/jmdict_english/tag_bank_1.json';
  const dictZip = fs.createWriteStream('./output/dict.zip');
  const indexData = {'title': 'Hanviet', 'format': 3, 'revision': 'hanviet1', 'sequenced': true};
  fse.outputFileSync(indexPath, JSON.stringify(indexData));
  fse.outputFileSync(termPath, JSON.stringify(output));
  const archive = archiver('zip', {
    gzip: true,
    zlib: {level: 9}
  });
  archive.on('error', function (err) {
    throw err;
  });
  archive.pipe(dictZip);
  archive.file(termPath, {name: 'term_bank_1.json'});
  archive.file(indexPath, {name: 'index.json'});
  archive.file(tagPath, {name: 'tag_bank_1.json'});
  await archive.finalize();
}

main();


