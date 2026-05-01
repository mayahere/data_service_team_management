export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export function formatTimeRemaining(deadlineString: string): {
  text: string;
  isBreached: boolean;
  isAtRisk: boolean;
} {
  const deadline = new Date(deadlineString);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (deadline.getTime() - now.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 0) {
    return { text: 'Breached', isBreached: true, isAtRisk: false };
  }

  const hours = Math.floor(diffInMinutes / 60);
  const minutes = diffInMinutes % 60;

  const isAtRisk = hours < 2; // Less than 2 hours is at risk

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return { text: `${days}d remaining`, isBreached: false, isAtRisk: false };
  }

  if (hours > 0) {
    return {
      text: `${hours}h ${minutes}m remaining`,
      isBreached: false,
      isAtRisk
    };
  }

  return { text: `${minutes}m remaining`, isBreached: false, isAtRisk: true };
}

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