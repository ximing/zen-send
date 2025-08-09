import React from 'react';

interface DateSeparatorProps {
  date: string;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
      <span className="text-xs text-[var(--text-muted)] font-medium tracking-wider">
        {date}
      </span>
      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
    </div>
  );
};

export default DateSeparator;
