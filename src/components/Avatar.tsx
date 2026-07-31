// Profile avatar: photo → chosen icon → initial. Presentational, used in the
// header menu and the staff settings list.
export const AVATAR_ICONS = ['🙂', '😎', '👷', '🧑‍💼', '👩‍💼', '🧑‍🔧', '👨‍💻', '👩‍💻', '🦊', '🐯', '🐼', '🐱', '🚀', '⭐', '🛠️', '💼']
export const AVATAR_COLORS = ['var(--brand)', '#1B5FD9', '#157F4C', '#6D28D9', '#DB2777', '#0F766E', '#B45309', '#5A6B82']

// Deterministic fallback colour from the name, so avatars without a set colour
// still look intentional and stable.
function colorFromName(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export type AvatarData = { name?: string | null; avatarUrl?: string | null; avatarIcon?: string | null; avatarColor?: string | null }

export function Avatar({ user, size = 32, className = '' }: { user: AvatarData; size?: number; className?: string }) {
  const name = (user.name ?? '').trim()
  const bg = user.avatarColor || colorFromName(name || '?')
  const dim = { width: size, height: size }
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={name} style={dim}
      className={`rounded-full object-cover ring-1 ring-black/5 ${className}`} />
  }
  const glyph = user.avatarIcon || (name.charAt(0).toUpperCase() || '?')
  return (
    <span style={{ ...dim, background: user.avatarIcon ? '#F1F3F6' : bg, fontSize: Math.round(size * (user.avatarIcon ? 0.55 : 0.42)) }}
      className={`rounded-full grid place-items-center font-bold text-white ring-1 ring-black/5 select-none ${className}`}>
      {glyph}
    </span>
  )
}
