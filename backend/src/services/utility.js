// 生成单词ID的辅助函数
function generateWid(word, pos) {
    return `${word.trim().toLowerCase().replace(/\s+/g, '_')}~${pos}`;
  }
  
  // 获取词性ID的辅助函数
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
  
  module.exports = {
    // 现有的导出...
    generateWid,
    getPosId
  };