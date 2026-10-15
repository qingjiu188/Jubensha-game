import type { PlayerStats, Rank } from '@/types';

/** 总分 = 武力 + 智力 + 敏捷 */
export function totalScore(s: PlayerStats): number {
  return s.str + s.int + s.agi;
}

/**
 * 三维初始 0~100（三项满分 300），成长点投入后总分可超过 300。
 * 阈值按 300 分制重排，超出上限一律 SSS。
 */
const TABLE: { min: number; rank: Rank }[] = [
  { min: 270, rank: 'SSS' },
  { min: 240, rank: 'SS' },
  { min: 210, rank: 'S' },
  { min: 180, rank: 'A' },
  { min: 150, rank: 'B' },
  { min: 120, rank: 'C' },
  { min: 90, rank: 'D' },
  { min: 0, rank: 'F' },
];

export function rankOf(s: PlayerStats): Rank {
  const t = totalScore(s);
  return TABLE.find((r) => t >= r.min)?.rank ?? 'F';
}

/** 各评级的徽章配色 */
export const RANK_STYLE: Record<Rank, { color: string; glow: string; label: string }> = {
  F: { color: '#6b6b6b', glow: 'rgba(107,107,107,0.25)', label: '残渣' },
  D: { color: '#8a8a8a', glow: 'rgba(138,138,138,0.25)', label: '勉强' },
  C: { color: '#a8a8a8', glow: 'rgba(168,168,168,0.28)', label: '合格' },
  B: { color: '#00ff9d', glow: 'rgba(0,255,157,0.30)', label: '优秀' },
  A: { color: '#00ff9d', glow: 'rgba(0,255,157,0.45)', label: '精锐' },
  S: { color: '#d4af37', glow: 'rgba(212,175,55,0.45)', label: '超凡' },
  SS: { color: '#d4af37', glow: 'rgba(212,175,55,0.60)', label: '绝域' },
  SSS: { color: '#d4af37', glow: 'rgba(255,220,120,0.75)', label: '禁忌' },
};

/** 系统毒舌点评 */
export function snarkOf(s: PlayerStats, rank: Rank): string {
  const t = totalScore(s);
  const weakest = (['str', 'int', 'agi'] as const).reduce((a, b) => (s[a] <= s[b] ? a : b));
  const weakName = { str: '武力', int: '智力', agi: '敏捷' }[weakest];

  if (rank === 'SSS')
    return t >= 300
      ? '系统备注：三项全满 300 分。档案科建议你立刻停止呼吸，以免污染平均值。你大概率活不过第三回合——因为规则不允许这种东西存在。'
      : `系统备注：${t} 分，已越过档案科划定的红线。审批意见只有两个字：观察。`;
  if (rank === 'SS' || rank === 'S')
    return `系统备注：${t} 分，纸面上很好看。副本里最好看的那批人，棺材也最贵。`;
  if (rank === 'A' || rank === 'B')
    return `系统备注：${t} 分。你的${weakName}拖了后腿，但拖后腿的人通常活得久一点——跑得慢，死得晚。`;
  if (rank === 'C' || rank === 'D')
    return `系统备注：${t} 分。档案科给了你一个建议：把遗书写在手心，握拳时不容易被血糊掉。`;
  return `系统备注：${t} 分。说实话，你能走到这里已经是个bug。建议不要深究${weakName}这项是怎么来的。`;
}
