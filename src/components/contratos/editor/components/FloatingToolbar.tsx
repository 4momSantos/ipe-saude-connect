import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, Italic, Underline, Strikethrough, 
  Code, Link as LinkIcon, Highlighter 
} from 'lucide-react';

export const FloatingToolbar = ({ editor }: any) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!editor) return;

    const updateToolbar = () => {
      const { from, to, empty } = editor.state.selection;
      
      // Não mostrar se seleção vazia
      if (empty) {
        setShow(false);
        return;
      }

      // Não mostrar se selecionou uma imagem
      const { node } = editor.state.selection as any;
      if (node && node.type.name === 'resizableImage') {
        setShow(false);
        return;
      }

      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);

      const left = (start.left + end.left) / 2;
      const top = start.top - 60; // Aumentar distância para evitar sobreposição

      setPosition({ top, left });
      setShow(true);
    };

    editor.on('selectionUpdate', updateToolbar);
    editor.on('update', updateToolbar);

    return () => {
      editor.off('selectionUpdate', updateToolbar);
      editor.off('update', updateToolbar);
    };
  }, [editor]);

  if (!editor || !show) return null;

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL do link:', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div 
      className="floating-toolbar"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        zIndex: 900,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        padding: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <Button
        size="sm"
        variant={editor.isActive('bold') ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        size="sm"
        variant={editor.isActive('italic') ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <Button
        size="sm"
        variant={editor.isActive('underline') ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </Button>
      
      <Button
        size="sm"
        variant={editor.isActive('strike') ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />
      
      <Button
        size="sm"
        variant={editor.isActive('code') ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-4 w-4" />
      </Button>
      
      <Button
        size="sm"
        variant={editor.isActive('link') ? 'default' : 'ghost'}
        onClick={handleSetLink}
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      
      <Button
        size="sm"
        variant={editor.isActive('highlight') ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="h-4 w-4" />
      </Button>
    </div>
  );
};
