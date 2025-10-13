import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { key: 'Ctrl + B', description: 'Negrito' },
  { key: 'Ctrl + I', description: 'Itálico' },
  { key: 'Ctrl + U', description: 'Sublinhado' },
  { key: 'Ctrl + Shift + X', description: 'Tachado' },
  { key: 'Ctrl + K', description: 'Inserir link' },
  { key: 'Ctrl + Z', description: 'Desfazer' },
  { key: 'Ctrl + Y', description: 'Refazer' },
  { key: 'Ctrl + Shift + V', description: 'Colar sem formatação' },
  { key: 'Tab', description: 'Indentar' },
  { key: 'Shift + Tab', description: 'Desindentar' },
  { key: '/', description: 'Menu de blocos' },
  { key: 'Ctrl + Alt + 1-6', description: 'Títulos H1-H6' },
];

export function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atalhos de Teclado</DialogTitle>
          <DialogDescription>
            Use estes atalhos para editar mais rápido
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">{shortcut.key}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
