import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarsProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onChange?: (value: number) => void;
  readonly?: boolean;
  showValue?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

export function Stars({
  value,
  max = 5,
  size = 'md',
  onChange,
  readonly = true,
  showValue = false,
  className,
}: StarsProps) {
  const handleClick = (index: number) => {
    if (!readonly && onChange) {
      onChange(index + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (!readonly && onChange && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onChange(index + 1);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, index) => {
          const isFilled = index < Math.floor(value);
          const isHalf = index < value && index >= Math.floor(value);

          return (
            <div
              key={index}
              onClick={() => handleClick(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              role={!readonly ? 'button' : undefined}
              tabIndex={!readonly ? 0 : undefined}
              className={cn(
                'relative',
                !readonly && 'cursor-pointer hover:scale-110 transition-transform'
              )}
            >
              {isHalf ? (
                <div className="relative">
                  <Star className={cn(sizeClasses[size], 'text-muted-foreground/30')} />
                  <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                    <Star 
                      className={cn(sizeClasses[size], 'text-yellow-400')} 
                      fill="currentColor"
                    />
                  </div>
                </div>
              ) : (
                <Star
                  className={cn(
                    sizeClasses[size],
                    isFilled ? 'text-yellow-400' : 'text-muted-foreground/30',
                    !readonly && 'hover:text-yellow-400'
                  )}
                  fill={isFilled ? 'currentColor' : 'none'}
                />
              )}
            </div>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-muted-foreground ml-1">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
