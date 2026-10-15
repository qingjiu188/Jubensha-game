'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Copy,
  Radio,
  Signal,
  Skull,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import TerminalButton from '@/components/ui/TerminalButton';
import { useGame } from '@/store/gameStore';
import {
  addFriend,
  fetchFriends,
  removeFriend,
  respondFriend,
  type FriendEntry,
} from '@/lib/archive';

/* =========================================================
 * SOCIAL：幸存者加密频道
 * ---------------------------------------------------------
 * 好友关系绑定在 User（账号）层 —— 角色死亡不影响
 * 通过 No.X 编号或档案代号添加
 * 列表显示对方当前状态：存活 / 已死亡 / 未建档
 * ========================================================= */

export default function SocialView() {
  const go = useGame((s) => s.go);
  const account = useGame((s) => s.account);

  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [handle, setHandle] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFriends(await fetchFriends());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    const r = await addFriend(handle.trim());
    setMsg(r.ok ? { ok: true, text: '请求已发送，等待对方确认' } : { ok: false, text: r.error ?? '失败' });
    if (r.ok) setHandle('');
    await load();
  };

  const accepted = friends.filter((f) => f.status === 'accepted');
  const incoming = friends.filter((f) => f.status === 'pending' && f.direction === 'incoming');
  const outgoing = friends.filter((f) => f.status === 'pending' && f.direction === 'outgoing');

  const copyNo = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(`No.${account.playerNo}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 px-5 py-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => go('LOBBY')}
            className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.25em] text-muted transition-colors hover:text-toxic"
          >
            <ArrowLeft size={13} />
            返回
          </button>
          <span className="text-[10px] tracking-[0.3em] text-muted">SOCIAL / 幸存者频道</span>
        </div>
        <span className="inline-flex items-center gap-2 border border-toxic/40 px-2.5 py-1 text-[10px] tracking-[0.25em] text-toxic">
          <Signal size={11} className="animate-pulse" />
          ONLINE
        </span>
      </div>

      {/* 我的身份牌 */}
      <div className="panel scanlines relative border-l-2 border-l-toxic/60 px-4 py-3.5">
        <p className="font-mono text-[10px] tracking-[0.25em] text-toxic/80">
          [ MY BEACON ] — 把编号发给别人，他们就能找到你
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="font-serif text-2xl tracking-[0.15em] text-chalk">
            No.{account?.playerNo ?? '—'}
          </span>
          <span className="font-mono text-sm tracking-[0.2em] text-toxic">
            {account?.username ?? '匿名'}
          </span>
          <button
            onClick={() => void copyNo()}
            className="inline-flex items-center gap-1.5 border border-hairline px-2.5 py-1 text-[10px] tracking-[0.2em] text-muted transition-colors hover:border-toxic/50 hover:text-toxic"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? '已复制' : '复制编号'}
          </button>
        </div>
      </div>

      {/* 添加好友 */}
      <div className="border border-hairline bg-black/60 px-4 py-3">
        <p className="mb-2 font-mono text-[10px] tracking-[0.25em] text-muted">
          $ connect --to [编号或档案代号]
        </p>
        <div className="flex gap-2">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="No.12 或 NightOwl7"
            className="flex-1 border border-hairline bg-black/60 px-3 py-2 font-mono text-xs tracking-[0.12em] text-toxic outline-none placeholder:text-muted/40 focus:border-toxic/50"
          />
          <div className="w-32">
            <TerminalButton
              onClick={() => void send()}
              disabled={!handle.trim()}
              prefix="[+]"
            >
              连接
            </TerminalButton>
          </div>
        </div>
        {msg && (
          <motion.p
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-2 font-mono text-[10px] tracking-[0.15em] ${
              msg.ok ? 'text-toxic' : 'text-blood-bright'
            }`}
          >
            {msg.ok ? '✔ ' : '⚠ '}
            {msg.text}
          </motion.p>
        )}
      </div>

      {/* 列表 */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {loading && (
          <p className="py-8 text-center font-mono text-[11px] tracking-[0.3em] text-muted">
            扫描频道……
          </p>
        )}

        {/* 待处理请求 */}
        {incoming.length > 0 && (
          <section>
            <p className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.3em] text-amber">
              <Radio size={11} />
               incoming 请求 · {incoming.length}
            </p>
            <div className="space-y-2">
              {incoming.map((f) => (
                <FriendRow key={f.friendshipId} f={f}>
                  <button
                    onClick={async () => {
                      await respondFriend(f.friendshipId, true);
                      await load();
                    }}
                    className="border border-toxic/50 p-1.5 text-toxic transition-colors hover:bg-toxic/10"
                    title="接受"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={async () => {
                      await respondFriend(f.friendshipId, false);
                      await load();
                    }}
                    className="border border-blood/50 p-1.5 text-blood-bright transition-colors hover:bg-blood/10"
                    title="拒绝"
                  >
                    <X size={12} />
                  </button>
                </FriendRow>
              ))}
            </div>
          </section>
        )}

        {/* 已发送 */}
        {outgoing.length > 0 && (
          <section>
            <p className="mb-2 text-[10px] tracking-[0.3em] text-muted">
              OUTGOING 请求 · {outgoing.length}
            </p>
            <div className="space-y-2">
              {outgoing.map((f) => (
                <FriendRow key={f.friendshipId} f={f}>
                  <button
                    onClick={async () => {
                      await removeFriend(f.friendshipId);
                      await load();
                    }}
                    className="border border-hairline p-1.5 text-muted transition-colors hover:border-blood/50 hover:text-blood-bright"
                    title="撤回"
                  >
                    <X size={12} />
                  </button>
                </FriendRow>
              ))}
            </div>
          </section>
        )}

        {/* 好友 */}
        <section>
          <p className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.3em] text-toxic/80">
            <UserPlus size={11} />
            已连接 · {accepted.length}
          </p>
          {accepted.length === 0 && !loading && (
            <div className="panel scanlines px-5 py-8 text-center">
              <p className="font-mono text-[11px] tracking-[0.25em] text-muted">
                NO PEERS — 频道里只有你自己的呼吸声。
              </p>
            </div>
          )}
          <div className="space-y-2">
            {accepted.map((f) => (
              <FriendRow key={f.friendshipId} f={f}>
                <button
                  onClick={async () => {
                    await removeFriend(f.friendshipId);
                    await load();
                  }}
                  className="border border-hairline p-1.5 text-muted transition-colors hover:border-blood/50 hover:text-blood-bright"
                  title="断开"
                >
                  <UserMinus size={12} />
                </button>
              </FriendRow>
            ))}
          </div>
        </section>
      </div>

      <p className="text-center font-mono text-[10px] tracking-[0.25em] text-muted/70">
        好友关系与你的账号绑定 —— 角色死亡不会切断这里的连接。
      </p>
    </div>
  );
}

/* ---------------- 好友行 ---------------- */

function FriendRow({ f, children }: { f: FriendEntry; children?: React.ReactNode }) {
  const dead = f.archiveStatus === 'dead';
  const none = f.archiveStatus === 'none';

  const statusText = dead ? '已死亡' : none ? '未建档' : '存活';
  const statusColor = dead ? '#8b0000' : none ? '#666' : '#00ff9d';

  return (
    <div
      className="panel scanlines relative flex items-center justify-between gap-3 px-3.5 py-2.5"
      style={dead ? { opacity: 0.62 } : undefined}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center border font-mono text-[11px]"
          style={{ borderColor: `${statusColor}66`, color: statusColor }}
        >
          {dead ? <Skull size={13} /> : f.user.playerNo}
        </span>
        <div className="min-w-0">
          <p className="truncate font-mono text-[12px] tracking-[0.15em] text-chalk/90">
            {f.user.username}
            <span className="ml-2 text-[10px] text-muted">No.{f.user.playerNo}</span>
          </p>
          <p className="font-mono text-[10px] tracking-[0.15em]" style={{ color: statusColor }}>
            {statusText}
            {f.archiveName && !dead && !none && (
              <span className="ml-2 text-muted">
                「{f.archiveName}」{f.rating ? ` · ${f.rating}` : ''}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  );
}
