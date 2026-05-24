export function classNames(
...classes: (string | undefined | null | false)[])
: string {
  return classes.filter(Boolean).join(' ');
}

export function getProjectColors(color: string): {
  bg100: string;
  text700: string;
  bg500: string;
  dot: string;
} {
  const colorMap: Record<
    string,
    {bg100: string;text700: string;bg500: string;dot: string;}> =
  {
    blue: {
      bg100: 'bg-blue-100',
      text700: 'text-blue-700',
      bg500: 'bg-blue-500',
      dot: 'bg-blue-400'
    },
    violet: {
      bg100: 'bg-violet-100',
      text700: 'text-violet-700',
      bg500: 'bg-violet-500',
      dot: 'bg-violet-400'
    },
    emerald: {
      bg100: 'bg-emerald-100',
      text700: 'text-emerald-700',
      bg500: 'bg-emerald-500',
      dot: 'bg-emerald-400'
    },
    slate: {
      bg100: 'bg-slate-100',
      text700: 'text-slate-700',
      bg500: 'bg-slate-500',
      dot: 'bg-slate-400'
    }
  };
  return colorMap[color] || colorMap.slate;
}