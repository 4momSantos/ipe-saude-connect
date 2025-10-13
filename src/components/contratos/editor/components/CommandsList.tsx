import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { 
  Heading1, Heading2, Heading3, List, ListOrdered, 
  CheckSquare, Quote, Code, Table, Image,
  Minus, FileText, AlertCircle
} from 'lucide-react';

const COMMANDS = [
  {
    title: 'Texto',
    icon: FileText,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Título 1',
    icon: Heading1,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Título 2',
    icon: Heading2,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Título 3',
    icon: Heading3,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Lista',
    icon: List,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Lista Numerada',
    icon: ListOrdered,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Lista de Tarefas',
    icon: CheckSquare,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Citação',
    icon: Quote,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Código',
    icon: Code,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Tabela',
    icon: Table,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: 'Divisor',
    icon: Minus,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Callout',
    icon: AlertCircle,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setCallout().run();
    },
  },
];

export const CommandsList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = COMMANDS[index];
    if (item) {
      item.command(props);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + COMMANDS.length - 1) % COMMANDS.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % COMMANDS.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.query]);

  return (
    <Command className="max-w-sm border shadow-md rounded-lg bg-card">
      <CommandGroup heading="Blocos">
        {COMMANDS.map((item, index) => (
          <CommandItem
            key={item.title}
            onSelect={() => selectItem(index)}
            className={index === selectedIndex ? 'bg-accent' : ''}
          >
            <item.icon className="mr-2 h-4 w-4" />
            <span>{item.title}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    </Command>
  );
});

CommandsList.displayName = 'CommandsList';
