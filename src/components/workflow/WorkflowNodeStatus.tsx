import { Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WorkflowNodeStatusProps {
  status: 'pending' | 'running' | 'completed' | 'failed';
  label?: string;
  className?: string;
}

export function WorkflowNodeStatus({ status, label, className = '' }: WorkflowNodeStatusProps) {
  const configs = {
    pending: {
      color: 'bg-gray-300 dark:bg-gray-700',
      borderColor: 'border-gray-300 dark:border-gray-700',
      textColor: 'text-gray-700 dark:text-gray-300',
      icon: Clock,
      defaultLabel: 'Pendente',
      animation: ''
    },
    running: {
      color: 'bg-blue-500',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-700 dark:text-blue-300',
      icon: Loader2,
      defaultLabel: 'Em Análise',
      animation: 'animate-pulse'
    },
    completed: {
      color: 'bg-green-600',
      borderColor: 'border-green-600',
      textColor: 'text-green-700 dark:text-green-300',
      icon: CheckCircle,
      defaultLabel: 'Aprovado',
      animation: ''
    },
    failed: {
      color: 'bg-red-600',
      borderColor: 'border-red-600',
      textColor: 'text-red-700 dark:text-red-300',
      icon: XCircle,
      defaultLabel: 'Rejeitado',
      animation: ''
    }
  };

  const config = configs[status];
  const Icon = config.icon;
  const displayLabel = label || config.defaultLabel;

  return (
    <Badge
      variant="outline"
      className={`
        ${config.color}/10 
        ${config.borderColor}
        ${config.textColor}
        ${config.animation}
        border-2
        gap-2
        px-3 py-1.5
        ${className}
      `}
    >
      <Icon className={`h-4 w-4 ${status === 'running' ? 'animate-spin' : ''}`} />
      <span className="font-medium">{displayLabel}</span>
    </Badge>
  );
}
