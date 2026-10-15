'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, LogIn, UserPlus } from 'lucide-react';
import TerminalButton from '@/components/ui/TerminalButton';
import GlitchText from '@/components/ui/GlitchText';
import { useGame } from '@/store/gameStore';

/* =========================================================
 * AUTH：登录 / 注册
 * 登录成功后由 store.bootstrap() 决定去向：
 *   无档案 → CHARACTER（建档）
 *   有档案 → LOBBY
 *   档案 dead → CHARACTER（重新建档）
 * ========================================================= */

type Tab = 'login' | 'register';

export default function AuthView() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useGame((s) => s.login);
  const register = useGame((s) => s.register);
  const submitting = useGame((s) => s.submitting);
  const authError = useGame((s) => s.authError);

  const submit = async () => {
    if (!email.trim() || !password) return;
    if (tab === 'login') await login(email.trim(), password);
    else await register(email.trim(), password);
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
                  { id: 'login', label: '登录', icon: LogIn },
                  { id: 'register', label: '注册', icon: UserPlus },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                const on = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs tracking-[0.3em] transition-colors ${
                      on
                        ? 'bg-toxic/10 text-toxic shadow-glow-toxic'
                        : 'text-muted hover:text-chalk'
                    }`}
                  >
                    <Icon size={13} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* 表单 */}
            <div className="space-y-4">
              <Field
                label="邮箱"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="player@instance.io"
              />
              <Field
                label="密码"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="至少 6 位"
              />
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
                disabled={submitting || !email.trim() || !password}
                prefix={tab === 'login' ? '[→]' : '[+]'}
              >
                {submitting
                  ? '验证中……'
                  : tab === 'login'
                    ? '进入副本系统'
                    : '注册并建立档案'}
              </TerminalButton>
            </div>

            <p className="mt-5 flex items-center gap-2 text-[10px] leading-relaxed tracking-[0.2em] text-muted">
              <Fingerprint size={12} className="shrink-0 text-toxic/60" />
              档案一经销毁，该账号下的一切都不会留存。
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

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] tracking-[0.3em] text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-hairline bg-black/60 px-4 py-2.5 font-mono text-sm tracking-[0.15em] text-toxic outline-none transition-colors placeholder:text-muted/40 focus:border-toxic/60 focus:shadow-glow-toxic"
      />
    </label>
  );
}
