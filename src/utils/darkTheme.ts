// Dark theme utility classes for Relampo platform
// Consistent color palette for all pages

export const dark = {
  // Backgrounds
  bg: {
    primary: 'bg-[#0a0a0a]',
    secondary: 'bg-[#111111]',
    tertiary: 'bg-[#1a1a1a]',
    hover: 'hover:bg-white/5',
    active: 'bg-yellow-500/10',
  },
  
  // Borders
  border: {
    subtle: 'border-white/5',
    normal: 'border-white/10',
    strong: 'border-white/20',
  },
  
  // Text
  text: {
    primary: 'text-zinc-100',
    secondary: 'text-zinc-300',
    tertiary: 'text-zinc-400',
    muted: 'text-zinc-500',
    disabled: 'text-zinc-600',
  },
  
  // Accents
  accent: {
    yellow: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-400/30',
      gradient: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
    },
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-400/30',
    },
    green: {
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      border: 'border-green-400/30',
    },
    red: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-400/30',
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-400/30',
    },
  },
  
  // Components
  card: 'bg-[#111111] border border-white/5 rounded-xl shadow-2xl',
  input: 'bg-[#0a0a0a] border border-white/10 text-zinc-100 placeholder-zinc-600',
  button: {
    primary: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold hover:from-yellow-300 hover:to-yellow-400',
    secondary: 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10',
    ghost: 'hover:bg-white/5 text-zinc-400',
  },
};
