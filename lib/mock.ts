import type { Difficulty } from '@/types';

/* =========================================================
 * Mock 静态数据
 * ========================================================= */

export const DIFFICULTIES: Difficulty[] = [
  { id: 'easy', name: '简单', desc: '死亡会被记住，但不会被回放。适合第一次睁眼的人。', danger: false },
  { id: 'hard', name: '困难', desc: '存档点会更少。你的每一次犹豫都会被计价。', danger: false },
  { id: 'purgatory', name: '炼狱', desc: '无存档。死亡即销毁档案，且系统会保留你的惨叫用于校准。', danger: true },
];

/**
 * 剧本卡：唯一数据源《副本.docx》→ lib/scenarios.ts（98 份，按难度分档）。
 * 这里做转发，保持旧引用路径可用。
 */
export { SCENARIOS, scenariosOf } from '@/lib/scenarios';

/**
 * 多轮剧情脚本（Mock）。
 * 每一轮：LLM 返回的 narrative（带标签）+ 三个推荐选项 + 状态补丁。
 */
export const SCRIPT: {
  narrative: string;
  options: [string, string, string];
  patch?: import('@/types').PlayerState extends never ? never : Partial<import('@/types').PlayerState>;
  ending?: import('@/types').EndingType;
  endingTitle?: string;
}[] = [
  {
    narrative:
      '【画面】铁门在身后合拢，门缝里挤出一线惨白的灯。走廊向两侧延伸，地板上有未被擦干净的暗色拖痕。\n【音效】远处有规律的滴水声，每七秒一次，比秒针慢，比呼吸快。\n【肢体】你不自觉地握紧了拳头，指甲陷进掌心。\n\n系统已载入副本。你的身份是「{identity}」。这里的一切都会记录，包括你的沉默。',
    options: ['A. 沿着拖痕向前走', 'B. 回头检查那扇铁门', 'C. 喊一声，看看有没有回应'],
    patch: { turn: 1 },
  },
  {
    narrative:
      '【判定：观察环境 | d20=16 | 目标 10】\n你在拖痕尽头发现一枚被踩扁的胸牌，编号被血糊住了最后一位。\n【肢体】你蹲下身，指尖擦过胸牌边缘，冰凉的金属有点粘。\n【音效】滴水的节奏忽然停了一拍，然后继续。\n\n线索 +1。有些东西不希望你数清楚。',
    options: ['A. 把胸牌收进口袋', 'B. 顺着走廊继续深入', 'C. 对着空气问「这是谁的」'],
    patch: { clues: 1, turn: 2, sp: -5 },
  },
  {
    narrative:
      '【画面】走廊尽头的房间亮着灯，门牌上写着「标本室 03」。门虚掩着，里面有人在小声说话，用的是你母亲的声音。\n【音效】非常轻的哼唱，调子你小时候听过。\n【判定：意志 | d20=6 | 目标 12】\n你的手抖了一下，理智掉了一块。\n【肢体】你发现自己在笑，而你并不想笑。',
    options: ['A. 推门进去', 'B. 从门缝往里看', 'C. 转身离开，越快越好'],
    patch: { turn: 3, hp: -12, sp: -10 },
  },
  {
    narrative:
      '【画面】房间里没有人。只有一台还在运转的录音机，磁带在空转，吐出那种哼唱。桌上摊着一份档案，封面上是你的名字。\n【音效】录音机咔哒一声，磁带倒带到头，重新开始。\n【肢体】你伸手去拿档案，手指穿过了纸面。\n\n线索 +1。你意识到：这份档案还没被写出来，而写它的人正在你身后。',
    options: ['A. 回头', 'B. 关掉录音机', 'C. 把自己的名字念出来'],
    patch: { clues: 2, turn: 4, st: -8 },
  },
  {
    narrative:
      '【判定：敏捷 | d20=4 | 目标 13】\n你回头太慢了。一只手从档案柜的阴影里伸出来，按住了你的后颈。\n【画面】视野剧烈倾斜。你看见地板上有另一具身体，穿着和你一样的衣服，脸朝下。\n【音效】非常近的呼吸声，就在耳后。\n【肢体】你想抬手，手臂却不属于你了。',
    options: ['A. 拼命挣扎', 'B. 放弃抵抗', 'C. 喊出自己的名字'],
    patch: { turn: 5, hp: -40, st: -20 },
  },
  {
    narrative:
      '【画面】灯灭了。再亮起时，你站在铁门外，手里握着一枚胸牌。\n【音效】滴水的声音消失了，取而代之的是极低频的白噪。\n【判定：存在确认 | d20=2 | 目标 15】\n【肢体】你低头看手，指纹是平的，像被磨掉了很多年。',
    options: ['A. 走向出口', 'B. 原地不动', 'C. 回头看那扇门'],
    patch: { turn: 6, hp: -60 },
    ending: 'BE',
    endingTitle: '结局 · 档案销毁',
  },
];

/** BE 结局的逐行销毁清单（每打印一行，对应 UI 元素消失） */
export const DESTRUCTION_LOG: { text: string; target: string }[] = [
  { text: '正在解除绑定：身份类别', target: 'role' },
  { text: '正在清除：武力数据', target: 'str' },
  { text: '正在清除：智力数据', target: 'int' },
  { text: '正在清除：敏捷数据', target: 'agi' },
  { text: '正在回收：全部线索（0/5）', target: 'clues' },
  { text: '正在注销：档案编号', target: 'rank' },
  { text: '正在回收并释放：身份代号', target: 'identity' },
  { text: '正在销毁：本轮副本实例', target: 'instance' },
];
