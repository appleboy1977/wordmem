const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.resolve(__dirname, '../../../wordmem.db');
const jsonPath = path.resolve(__dirname, '../../../tool/yibo519.json');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Database connected');
});

// 将词性转换为pos_id
function getPosId(pos) {
  pos = pos.toLowerCase();
  if (pos.includes('verb') || pos.includes('v.')) return 'v';
  if (pos.includes('noun') || pos.includes('n.')) return 'n';
  if (pos.includes('adj') || pos.includes('adj.')) return 'x';
  if (pos.includes('adv') || pos.includes('adv.')) return 'f';
  if (pos.includes('conj') || pos.includes('conjunction')) return 'c';
  if (pos.includes('pron') || pos.includes('pronoun')) return 'd';
  if (pos.includes('prep') || pos.includes('preposition')) return 'j';
  if (pos.includes('phr') || pos.includes('phrasal')) return 'p';
  return 'o'; // other
}

// 处理单词ID
function generateWid(word, pos) {
  // 替换空格为下划线
  const normalizedWord = word.trim().replace(/\s+/g, '_');
  const posId = getPosId(pos);
  return `${normalizedWord}~${posId}`;
}

// 解码 UTF-8 编码的文本
function decodeUTF8(text) {
  try {
    // 处理 \u 开头的 Unicode 编码
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => 
      String.fromCharCode(parseInt(hex, 16))
    );
  } catch (error) {
    console.error('Error decoding UTF-8:', error);
    return text;
  }
}

async function importWords() {
  try {
    // 读取JSON文件
    console.log('Reading JSON file from:', jsonPath);
    const data = fs.readFileSync(jsonPath, 'utf8');
    const words = JSON.parse(data);
    console.log(`Loaded ${words.length} words from JSON`);

    // 开始事务
    console.log('Starting transaction...');
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 准备SQL语句
    const insertWordStmt = db.prepare('INSERT OR IGNORE INTO words (wid, word, pron, pos, explain) VALUES (?, ?, ?, ?, ?)');
    const insertRecordStmt = db.prepare(`
      INSERT OR IGNORE INTO study_records (wid, user_id, ldate, level, note, score)
      VALUES (?, 1, strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'), ?, ?, ?)
    `);

    // 插入数据
    let successCount = 0;
    let errorCount = 0;
    
    for (const word of words) {
      const wid = generateWid(word.word, word.pos);
      const decodedExplain = decodeUTF8(word.explain);
      const decodedNote = word.note ? decodeUTF8(word.note) : '';
      
      console.log(`Processing word: ${word.word} (${wid})`);
      console.log(`Decoded explain: ${decodedExplain}`);
      
      try {
        await new Promise((resolve, reject) => {
          insertWordStmt.run(
            wid,
            word.word,
            word.pron,
            getPosId(word.pos),
            decodedExplain,
            (err) => {
              if (err) {
                console.error(`Error inserting word ${wid}:`, err);
                reject(err);
              } else {
                insertRecordStmt.run(
                  wid,
                  parseInt(word.score) || 0,
                  decodedNote,
                  parseInt(word.score) || 0,
                  (err) => {
                    if (err) {
                      console.error(`Error inserting record for ${wid}:`, err);
                      reject(err);
                    } else {
                      successCount++;
                      resolve();
                    }
                  }
                );
              }
            }
          );
        });
      } catch (err) {
        errorCount++;
        console.error(`Failed to process word ${word.word}:`, err);
      }
    }

    // 完成事务
    console.log('Committing transaction...');
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log(`Import summary:
      Total words: ${words.length}
      Successfully imported: ${successCount}
      Failed: ${errorCount}
    `);
  } catch (error) {
    console.error('Error importing words:', error);
    // 回滚事务
    console.log('Rolling back transaction...');
    await new Promise((resolve) => {
      db.run('ROLLBACK', () => resolve());
    });
  } finally {
    console.log('Closing database connection...');
    db.close();
  }
}

// 运行导入
importWords().then(() => {
  console.log('Import completed');
}).catch((err) => {
  console.error('Import failed:', err);
});
