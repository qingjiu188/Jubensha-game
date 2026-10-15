'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Dices, Fingerprint, LogOut } from 'lucide-react';
import TerminalButton from '@/components/ui/TerminalButton';
import StatBar from '@/components/ui/StatBar';
import RankBadge from '@/components/ui/RankBadge';
import AbilityBadge from '@/components/ui/AbilityBadge';
import RadarChart from '@/components/ui/RadarChart';
import Typewriter from '@/components/ui/Typewriter';
import { useGame } from '@/store/gameStore';
import { snarkOf, totalScore } from '@/lib/rank';
import { IDENTITY_TOTAL } from '@/lib/abilities';

export default function CharacterView() {
  const player = useGame((s) => s.player);
  const rollStats = useGame((s) => s.rollStats);
  const confirm = useGame((s) => s.confirmCharacter);
  const setProfile = useGame((s) => s.setProfile);
  const submitting = useGame((s) => s.submitting);
  const account = useGame((s) => s.account);
  const identityRemaining = useGame((s) => s.identityRemaining);
  const authError = useGame((s) => s.authError);
  const logout = useGame((s) => s.logout);

  const total = useMemo(() => totalScore(player), [player]);
  const snark = useMemo(() => snarkOf(player, player.rank), [player]);
  // 身份分发完成即可确认；名字 / 性别 / 样貌是玩家自定义项，可不填
  const ready = !!player.role && player.role !== '未登记';

  const GENDERS: { id: string; label: string }[] = [
    { id: 'male', label: '男' },
    { id: 'female', label: '女' },
    { id: 'other', label: '其他' },
    { id: 'hidden', label: '保密' },
  ];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-start gap-6 px-6 py-8 md:justify-center">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl tracking-[0.3em] text-chalk">建 档</h2>
        <span className="flex items-center gap-3 text-[10px] tracking-[0.3em] text-muted">
          {account && (
            <>
              <span className="border border-toxic/40 px-2 py-0.5 text-toxic">
                No.{account.playerNo} · {account.username}
              </span>
              <button
                onClick={() => void logout()}
                className="inline-flex items-center gap-1 border border-hairline px-2 py-0.5 transition-colors hover:border-blood/70 hover:text-blood-bright"
              >
                <LogOut size={11} />
                切换账号
              </button>
            </>
          )}
          STEP 01 / CHARACTER
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* 左：输入 */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="panel scanlines relative flex flex-col justify-between p-6"
        >
          <div>
            <p className="mb-2 text-[10px] tracking-[0.3em] text-muted">DISPATCH / 身份分发</p>
            <label className="mb-3 block font-serif text-lg tracking-widest text-chalk/90">
              系统已为你指派身份
            </label>
            <div className="flex items-center justify-between border border-toxic/40 bg-black/60 px-4 py-3">
              <span className="font-serif text-2xl tracking-[0.2em] text-toxic">
                {player.role !== '未登记' ? player.role : '分发中……'}
              </span>
              <span className="text-[10px] tracking-[0.2em] text-muted">
                {player.ability ? `异能 · ${player.ability.name}` : '—'}
              </span>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed tracking-[0.12em] text-muted">
              身份为<strong className="text-chalk/70">主身份</strong>：决定你的异能，终身锁定。
              进入副本后系统会按副本背景另发一个临时身份，仅作角色扮演。
            </p>

            <div className="mt-4 h-px w-full bg-hairline" />

            {/* 自定义形象：名字 / 性别 / 样貌（可留空，代号兜底） */}
            <p className="mb-3 mt-4 text-[10px] tracking-[0.3em] text-muted">PROFILE / 自定义形象</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] tracking-[0.2em] text-muted">名字</label>
                <input
                  value={player.name}
                  onChange={(e) => setProfile({ name: e.target.value })}
                  maxLength={20}
                  placeholder={player.role !== '未登记' ? `留空则以「${player.role}」为名` : '输入你的名字'}
                  className="w-full border border-hairline bg-black/50 px-3 py-2 font-mono text-[13px] tracking-wider text-chalk outline-none transition-colors placeholder:text-muted/50 focus:border-toxic/60"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] tracking-[0.2em] text-muted">性别</label>
                <div className="flex gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setProfile({ gender: player.gender === g.id ? null : g.id })}
                      className={`flex-1 border px-2 py-1.5 text-[11px] tracking-[0.25em] transition-colors ${
                        player.gender === g.id
                          ? 'border-toxic/70 bg-toxic/10 text-toxic'
                          : 'border-hairline text-muted hover:border-toxic/40 hover:text-chalk/80'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 flex items-baseline justify-between text-[10px] tracking-[0.2em] text-muted">
                  样貌自述
                  <span className="text-muted/50">{(player.appearance ?? '').length}/300</span>
                </label>
                <textarea
                  value={player.appearance ?? ''}
                  onChange={(e) => setProfile({ appearance: e.target.value })}
                  maxLength={300}
                  rows={3}
                  placeholder="例如：及肩黑发，左眼下方有颗泪痣，总穿着一件洗旧的黑夹克……"
                  className="w-full resize-none border border-hairline bg-black/50 px-3 py-2 font-mono text-[12px] leading-relaxed tracking-wider text-chalk outline-none transition-colors placeholder:text-muted/40 focus:border-toxic/60"
                />
              </div>
            </div>

            <div className="mt-4 h-px w-full bg-hairline" />
            <p className="mt-4 text-xs leading-relaxed text-muted">
              身份由系统分发，共 {IDENTITY_TOTAL} 个，<span className="text-amber">全局唯一</span>：
              已被他人占用的身份不会再出现。
              <br />
              身份与异能一一绑定，确认后终身锁定；档案销毁后该身份才会释放。
              <br />
              当前剩余可分发 <span className="text-toxic">{identityRemaining || '—'}</span> 个。
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={rollStats}
              className="group flex items-center gap-2 border border-hairline px-3 py-2 text-xs tracking-widest text-muted transition-colors hover:border-amber/60 hover:text-amber"
            >
              <Dices size={14} className="transition-transform group-hover:rotate-180" />
              重新分发（身份 + 属性）
            </button>
            <span className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-muted">
              <Fingerprint size={13} className="text-toxic/60" />
              身份：{player.role}
            </span>
          </div>
        </motion.div>

        {/* 右：档案卡 */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="panel noise relative p-6"
        >
          <div className="relative z-[2]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-[10px] tracking-[0.3em] text-muted">DOSSIER / 档案卡</p>
                <p className="mt-1 font-serif text-3xl tracking-[0.2em] text-chalk">
                  {player.name || player.role || '________'}
                </p>
                <p className="mt-1 text-[11px] tracking-[0.2em] text-toxic/70">
                  {player.role}
                  {player.gender && (
                    <span className="ml-2 text-muted">
                      {GENDERS.find((g) => g.id === player.gender)?.label ?? ''}
                    </span>
                  )}
                </p>
                {player.appearance && (
                  <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed tracking-[0.1em] text-muted">
                    {player.appearance}
                  </p>
                )}
              </div>
              <RankBadge rank={player.rank} size="md" />
            </div>

            {/* HP / SP / ST */}
            <div className="mb-6 grid grid-cols-3 gap-4">
              <StatBar label="HP" value={player.hp} color="hp" />
              <StatBar label="SP" value={player.sp} color="sp" />
              <StatBar label="ST" value={player.st} color="st" />
            </div>

            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-6">
              <RadarChart
                data={[
                  { label: '武力', value: player.str },
                  { label: '智力', value: player.int },
                  { label: '敏捷', value: player.agi },
                ]}
                max={100}
              />
              <div className="space-y-4">
                <StatBar label="武力 STR" value={player.str} max={100} low={0} color="amber" />
                <StatBar label="智力 INT" value={player.int} max={100} low={0} color="toxic" />
                <StatBar label="敏捷 AGI" value={player.agi} max={100} low={0} color="toxic" />
                <div className="flex items-baseline justify-between border-t border-hairline pt-3 text-xs">
                  <span className="tracking-[0.25em] text-muted">综合评分</span>
                  <span className="font-serif text-2xl text-amber">{total}</span>
                </div>
                <p className="text-[10px] leading-relaxed tracking-[0.12em] text-muted">
                  初始三维 0~100。建档确认后只能消耗成长点提升，无上限；
                  成长点仅由通关副本发放，随角色销毁清零。
                </p>
              </div>
            </div>

            {/* 随机异能 */}
            <div className="mt-6 border-t border-hairline pt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[10px] tracking-[0.3em] text-muted">ABILITY / 随机异能</span>
                <span className="text-[10px] tracking-[0.2em] text-blood-bright/70">
                  终身锁定 · 不可更改
                </span>
              </div>
              <AbilityBadge ability={player.ability} size="md" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* 毒舌点评 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="panel relative border-l-2 border-l-blood/70 px-5 py-4"
      >
        <p className="mb-1 text-[10px] tracking-[0.3em] text-blood-bright/80">SYSTEM NOTE</p>
        <p className="min-h-[3em] text-xs leading-relaxed text-chalk/80">
          <Typewriter text={snark} speed={22} key={snark} />
        </p>
      </motion.div>

      {authError && (
        <p className="text-right text-[11px] tracking-[0.2em] text-blood-bright">
          ⚠ {authError}
        </p>
      )}

      <div className="flex justify-end">
        <div className="w-full md:w-72">
          <TerminalButton
            onClick={() => void confirm()}
            disabled={!ready || submitting}
            variant={ready ? 'default' : 'ghost'}
            prefix="[→]"
          >
            {submitting ? '正在写入数据库……' : ready ? '确认身份，进入筛选' : '等待系统分发'}
          </TerminalButton>
        </div>
      </div>
    </div>
  );
}
