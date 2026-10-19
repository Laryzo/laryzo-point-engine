import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  currentPage: number; // 0-based
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const getPages = (current: number, total: number): (number | 'dots')[] => {
  const pages: (number | 'dots')[] = [];
  const add = (p: number) => { if (!pages.includes(p)) pages.push(p); };
  add(0);
  const start = Math.max(1, current - 2);
  const end = Math.min(total - 2, current + 2);
  if (start > 1) pages.push('dots');
  for (let i = start; i <= end; i++) add(i);
  if (end < total - 2) pages.push('dots');
  if (total > 1) add(total - 1);
  return pages;
};

export const PageJumpPagination = ({ currentPage, totalPages, onPageChange, disabled }: Props) => {
  const [jump, setJump] = useState('');
  if (totalPages <= 1) return null;

  const go = (p: number) => {
    const clamped = Math.min(Math.max(p, 0), totalPages - 1);
    if (clamped !== currentPage) onPageChange(clamped);
  };

  const submitJump = () => {
    const n = parseInt(jump, 10);
    if (!isNaN(n)) go(n - 1);
    setJump('');
  };

  return (
    <div className="flex flex-col gap-3 mt-4 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-muted-foreground">
        Halaman {currentPage + 1} dari {totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="outline" size="sm" disabled={currentPage === 0 || disabled} onClick={() => go(currentPage - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {getPages(currentPage, totalPages).map((p, i) =>
          p === 'dots' ? (
            <span key={`d${i}`} className="px-1 text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              size="sm"
              variant={p === currentPage ? 'default' : 'outline'}
              disabled={disabled}
              onClick={() => go(p)}
              className="min-w-9"
            >
              {p + 1}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1 || disabled} onClick={() => go(currentPage + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1 ml-2">
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitJump(); }}
            placeholder="Hal."
            className="h-9 w-20"
          />
          <Button size="sm" variant="secondary" onClick={submitJump} disabled={disabled || !jump}>
            Go
          </Button>
        </div>
      </div>
    </div>
  );
};
