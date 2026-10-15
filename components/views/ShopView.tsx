'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Coins,
  FlaskConical,
  Shield,
  Skull,
  ShoppingBag,
  Swords,
} from 'lucide-react';
import TerminalButton from '@/components/ui/TerminalButton';
import { useGame } from '@/store/gameStore';
import { POTION_HEAL, POTION_PRICE } from '@/types';
import { SHOP_ITEMS, weaponLabel } from '@/lib/loot';
import type { PotionKind, Weapon } from '@/types';

/** 商城：全服唯一的物资入口。只卖两种恢复剂，不卖任何回血道具。 */
export default function ShopView() {
  const go = useGame((s) => s.go);
  const player = useGame((s) => s.player);
  const buyPotion = useGame((s) => s.buyPotion);
  const usePotion = useGame((s) => s.usePotion);
  const sellWeapon = useGame((s) => s.sellWeapon);
  const equipWeapon = useGame((s) => s.equipWeapon);
  const [flash, setFlash] = useState<string | null>(null);

  const credits = player.credits ?? 0;
  const potions = player.potions ?? { sp: 0, st: 0 };
  const weapons = player.weapons ?? [];

  const toast = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  };

  const onBuy = (kind: PotionKind, name: string) => {
    if (credits < POTION_PRICE) {
      toast('积分不足。通关副本或卖出武器可以换取积分。');
      return;
    }
    if (buyPotion(kind)) toast(`${name} ×1 已入库。`);
  };

  const onUse = (kind: PotionKind, name: string) => {
    if (usePotion(kind)) toast(`${name} 已使用，恢复 ${POTION_HEAL} 点。`);
    else toast(`没有${name}。`);
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 overflow-y-auto px-6 py-8">
      {/* 页头 */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-4">
          <button
            onClick={() => go('LOBBY')}
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.3em] text-muted transition-colors hover:text-toxic"
          >
            <ArrowLeft size={12} />
            返回终端
          </button>
          <h2 className="font-serif text-2xl tracking-[0.3em] text-chalk">商 城</h2>
        </div>
        <span className="inline-flex items-center gap-2 border border-amber/50 px-3 py-1 text-[11px] tracking-[0.25em] text-amber">
          <Coins size={12} />
          积分 {credits}
        </span>
      </div>

      <p className="border-l-2 border-blood/60 pl-3 text-[11px] leading-relaxed tracking-[0.12em] text-muted">
        这里不卖命。生命值只能在你离开副本之后由系统恢复 —— 副本内没有任何回血手段，
        除非你的异能本身就写着能治。
      </p>

      {/* 恢复剂货架 */}
      <div className="flex items-baseline justify-between">
        <h3 className="inline-flex items-center gap-2 text-xs tracking-[0.35em] text-muted">
          <FlaskConical size={13} className="text-toxic/70" />
          RESTORATIVE / 恢复剂
        </h3>
        <span className="text-[10px] tracking-[0.2em] text-muted/70">
          {POTION_PRICE} 积分 / 罐 · 恢复 {POTION_HEAL} 点
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SHOP_ITEMS.map((item, i) => (
          <motion.div
            key={item.kind}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="panel flex flex-col gap-3 p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-serif text-xl tracking-[0.2em] text-chalk">{item.name}</p>
                <p className="mt-1 text-[10px] tracking-[0.3em] text-toxic/70">{item.sub}</p>
              </div>
              <span className="font-mono text-sm text-amber">{item.price}</span>
            </div>
            <div className="h-px w-full bg-hairline" />
            <p className="text-[11px] leading-relaxed text-muted">{item.desc}</p>

            <div className="flex items-center justify-between text-[10px] tracking-[0.2em]">
              <span className="text-muted">
                库存 <span className="font-mono text-chalk">{potions[item.kind] ?? 0}</span>
              </span>
              {item.kind === 'sp' ? (
                <span className="text-muted">
                  当前精神 {player.sp} / 100
                </span>
              ) : (
                <span className="text-muted">当前体力 {player.st} / 100</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onBuy(item.kind, item.name)}
                disabled={credits < POTION_PRICE}
                className="inline-flex items-center justify-center gap-1.5 border border-amber/60 px-3 py-2 text-[11px] tracking-[0.2em] text-amber transition-colors hover:bg-amber/15 disabled:cursor-not-allowed disabled:border-hairline disabled:text-muted/50"
              >
                <ShoppingBag size={12} />
                购买
              </button>
              <button
                onClick={() => onUse(item.kind, item.name)}
                disabled={(potions[item.kind] ?? 0) <= 0}
                className="inline-flex items-center justify-center gap-1.5 border border-toxic/50 px-3 py-2 text-[11px] tracking-[0.2em] text-toxic transition-colors hover:bg-toxic/10 disabled:cursor-not-allowed disabled:border-hairline disabled:text-muted/40"
              >
                <FlaskConical size={12} />
                使用
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 武器库 */}
      <div className="mt-2 flex items-baseline justify-between">
        <h3 className="inline-flex items-center gap-2 text-xs tracking-[0.35em] text-muted">
          <Swords size={13} className="text-blood-bright/70" />
          ARMORY / 战利品 · {weapons.length} 件
        </h3>
        <span className="text-[10px] tracking-[0.2em] text-muted/70">
          累计击杀 {player.kills ?? 0}
        </span>
      </div>

      {weapons.length === 0 ? (
        <div className="panel px-5 py-8 text-center">
          <Skull size={22} className="mx-auto mb-3 text-muted/50" />
          <p className="text-[11px] tracking-[0.2em] text-muted">
            武器库是空的。击杀副本中的宿主，有概率掉落它身上的东西。
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {weapons.map((w) => (
            <WeaponCard
              key={w.id}
              w={w}
              equipped={player.equippedWeaponId === w.id}
              onEquip={() => equipWeapon(player.equippedWeaponId === w.id ? null : w.id)}
              onSell={() => {
                sellWeapon(w.id);
                toast(`${w.name} 已售出，+${w.value} 积分。`);
              }}
            />
          ))}
        </div>
      )}

      <p className="pb-4 text-[10px] leading-relaxed tracking-[0.12em] text-muted/70">
        武器装备后立即生效，跨局保留；角色死亡时随档案一并销毁。
      </p>

      {/* 提示条 */}
      {flash && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none fixed bottom-8 left-1/2 z-50 -translate-x-1/2 border border-toxic/50 bg-black/85 px-5 py-2.5 text-[11px] tracking-[0.2em] text-toxic"
        >
          {flash}
        </motion.div>
      )}
    </div>
  );
}

function WeaponCard({
  w,
  equipped,
  onEquip,
  onSell,
}: {
  w: Weapon;
  equipped: boolean;
  onEquip: () => void;
  onSell: () => void;
}) {
  return (
    <div
      className={`panel flex flex-col gap-2 p-4 transition-colors ${
        equipped ? 'border-toxic/70 shadow-glow-toxic' : 'border-hairline'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-serif text-base tracking-[0.12em] text-chalk">{w.name}</p>
        <Shield size={13} className={equipped ? 'text-toxic' : 'text-muted/40'} />
      </div>
      <p className="text-[10px] tracking-[0.15em] text-muted">掉落自：{w.from}</p>
      <div className="h-px w-full bg-hairline" />
      <div className="flex items-center justify-between text-[10px] tracking-[0.2em]">
        <span className={w.stat ? 'text-amber' : 'text-muted/60'}>{weaponLabel(w)}</span>
        <span className="text-amber/80">卖 {w.value}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onEquip}
          className={`border px-2 py-1.5 text-[10px] tracking-[0.2em] transition-colors ${
            equipped
              ? 'border-toxic/70 text-toxic hover:bg-toxic/10'
              : 'border-hairline text-muted hover:border-chalk/40 hover:text-chalk'
          }`}
        >
          {equipped ? '已装备' : '装备'}
        </button>
        <button
          onClick={onSell}
          className="border border-hairline px-2 py-1.5 text-[10px] tracking-[0.2em] text-muted transition-colors hover:border-amber/60 hover:text-amber"
        >
          卖出
        </button>
      </div>
    </div>
  );
}
