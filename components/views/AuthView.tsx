'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Fingerprint, KeyRound, Loader2, LogIn, ShieldAlert, UserPlus } from 'lucide-react';
import TerminalButton from '@/components/ui/TerminalButton';
import GlitchText from '@/components/ui/GlitchText';
import { useGame } from '@/store/gameStore';

/* =========================================================
 * AUTH：档案接入（登录 / 注册）
 * ---------------------------------------------------------
 * 不用邮箱：档案代号（仅英文数字，全局唯一）+ 接入密钥
 * 前端做实时正则校验与查重，后端再做一次唯一性校验
 * 登录成功后由 store.bootstrap() 决定去向：
 *   无档案 → CHARACTER（建档）
 *   有档案 → LOBBY
 * ========================================================= */

type Tab = 'login' | 'register';

const USERNAME_RE = /^[a-zA-Z0-9]+$/;

export default function AuthView() {
  const [tab, setTab] = useState<Tab>('login');
  const [username, setUsername] = useState('');
  const [key, setKey] = useState('');

  /** 代号实时校验结果 */
  const [check, setCheck] = useState<{ state: 'idle' | 'checking' | 'ok' | 'bad'; msg?: string }>({
    state: 'idle',
  });

  const login = useGame((s) => s.login);
  const register = useGame((s) => s.register);
  const submitting = useGame((s) => s.submitting);
  const authError = useGame((s) => s.authError);

  /* ---------- 实时校验（仅注册 tab） ---------- */
  useEffect(() => {
    if (tab !== 'register') {
      setCheck({ state: 'idle' });
      return;
    }
    const v = username.trim();
    if (!v) {
      setCheck({ state: 'idle' });
      return;
    }
    if (!USERNAME_RE.test(v)) {
      setCheck({ state: 'bad', msg: '只允许英文与数字' });
      return;
    }
    if (v.length < 2 || v.length > 20) {
      setCheck({ state: 'bad', msg: '长度需为 2–20 位' });
      return;
    }

    let alive = true;
    setCheck({ state: 'checking' });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check?username=${encodeURIComponent(v)}`);
        const data = (await res.json()) as { ok: boolean; reason?: string };
        if (!alive) return;
        setCheck(data.ok ? { state: 'ok' } : { state: 'bad', msg: data.reason ?? '不可用' });
      } catch {
        if (alive) setCheck({ state: 'idle' });
      }
    }, 380);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [username, tab]);

  const nameOk = tab === 'login' ? username.trim().length > 0 : check.state === 'ok';
  const keyOk = key.length >= 4;
  const ready = nameOk && keyOk && !submitting;

  const submit = async () => {
    if (!ready) return;
    if (tab === 'login') await login(username.trim(), key);
    else await register(username.trim(), key);
  };

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* 标题 */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-[10px] tracking-[0.6em] text-muted">INSTANCE — 副本</p>
          <GlitchText
            as="h1"
            className="animate-breathe font-serif text-5xl font-bold tracking-[0.16em] text-chalk"
          >
            副 本
          </GlitchText>
          <p className="mt-2 font-mono text-[10px] tracking-[0.5em] text-toxic/70">I N S T A N C E</p>
        </div>

        {/* 卡片 */}
        <div className="panel scanlines relative p-6">
          <div className="relative z-[2]">
            {/* Tab */}
            <div className="mb-6 grid grid-cols-2 border border-hairline">
              {(
                [
                  { id: 'login', label: '接入', icon: LogIn },
                  { id: 'register', label: '新档案', icon: UserPlus },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                const on = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs tracking-[0.3em] transition-colors ${
                      on ? 'bg-toxic/10 text-toxic shadow-glow-toxic' : 'text-muted hover:text-chalk'
                    }`}
                  >
                    <Icon size={13} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* 终端提示行 */}
            <div className="mb-5 border-l-2 border-toxic/50 bg-black/40 px-3 py-2 font-mono text-[10px] leading-relaxed text-muted">
              <span className="text-toxic">survivor@instance</span>
              <span className="text-muted">:</span>
              <span className="text-amber">~</span>
              <span className="text-muted">$ </span>
              {tab === 'login' ? 'auth --attach' : 'auth --new-archive'}
              <span className="term-cursor text-toxic" />
            </div>

            {/* 表单 */}
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 flex items-center justify-between text-[10px] tracking-[0.3em] text-muted">
                  <span>档案代号</span>
                  <span className="text-muted/60">A-Z / 0-9</span>
                </span>
                <div className="relative">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                    placeholder="NightOwl7"
                    maxLength={20}
                    className="w-full border border-hairline bg-black/60 px-4 py-2.5 pr-9 font-mono text-sm tracking-[0.15em] text-toxic outline-none transition-colors placeholder:text-muted/40 focus:border-toxic/60 focus:shadow-glow-toxic"
                  />
                  {tab === 'register' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {check.state === 'checking' && (
                        <Loader2 size={14} className="animate-spin text-muted" />
                      )}
                      {check.state === 'ok' && <Check size={14} className="text-toxic" />}
                      {check.state === 'bad' && <ShieldAlert size={14} className="text-blood-bright" />}
                    </span>
                  )}
                </div>
                {check.state === 'bad' && (
                  <span className="mt-1.5 block text-[10px] tracking-[0.15em] text-blood-bright">
                    ⚠ {check.msg}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-2 flex items-center justify-between text-[10px] tracking-[0.3em] text-muted">
                  <span>接入密钥</span>
                  <span className="text-muted/60">≥ 4 位</span>
                </span>
                <div className="relative">
                  <KeyRound
                    size={13}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/60"
                  />
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-hairline bg-black/60 px-4 py-2.5 pl-9 font-mono text-sm tracking-[0.25em] text-toxic outline-none transition-colors placeholder:text-muted/40 focus:border-toxic/60 focus:shadow-glow-toxic"
                  />
                </div>
              </label>
            </div>

            {authError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 border-l-2 border-blood px-3 py-2 text-[11px] tracking-[0.2em] text-blood-bright"
              >
                ⚠ {authError}
              </motion.p>
            )}

            <div className="mt-6">
              <TerminalButton
                onClick={submit}
                disabled={!ready}
                prefix={tab === 'login' ? '[→]' : '[+]'}
              >
                {submitting
                  ? '验证中……'
                  : tab === 'login'
                    ? '接入副本系统'
                    : '建立新档案'}
              </TerminalButton>
            </div>

            <p className="mt-5 flex items-start gap-2 text-[10px] leading-relaxed tracking-[0.2em] text-muted">
              <Fingerprint size={12} className="mt-0.5 shrink-0 text-toxic/60" />
              档案一经销毁，角色的一切都会清零；账号与你在论坛、频道留下的一切会被保留。
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-[11px] tracking-[0.25em] text-blood-bright/80">
          ⚠ 死亡不可回溯。你会失去这里的一切。
        </p>
      </motion.div>
    </div>
  );
}
