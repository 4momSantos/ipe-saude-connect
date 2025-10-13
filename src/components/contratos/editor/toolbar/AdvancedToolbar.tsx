import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorPicker } from "./ColorPicker";
import { FontSelector } from "./FontSelector";
import {
  Bold, Italic, Underline, Strikethrough, Code,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Indent, Outdent,
  Image, Table, Link, FileText, Highlighter,
  Undo, Redo, Subscript, Superscript
} from "lucide-react";

interface AdvancedToolbarProps {
  editor: Editor;
  onInsertImage: () => void;
  onInsertTable: () => void;
  onInsertPageBreak: () => void;
  onToggleFields: () => void;
}

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

export function AdvancedToolbar({ 
  editor, 
  onInsertImage, 
  onInsertTable,
  onInsertPageBreak,
  onToggleFields 
}: AdvancedToolbarProps) {
  const currentFontSize = editor.getAttributes('textStyle').fontSize || '12';
  const currentFont = editor.getAttributes('textStyle').fontFamily || 'Arial';
  const currentColor = editor.getAttributes('textStyle').color;
  const currentHighlight = editor.getAttributes('highlight').color;

  return (
    <div className="border-b bg-card p-2 flex flex-wrap gap-1 items-center">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Desfazer (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Refazer (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Font Family & Size */}
      <div className="flex items-center gap-1">
        <FontSelector
          value={currentFont}
          onChange={(font) => editor.chain().focus().setFontFamily(font).run()}
        />
        <Select
          value={currentFontSize}
          onValueChange={(size) => editor.chain().focus().setFontSize(size).run()}
        >
          <SelectTrigger className="w-[80px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Text Formatting */}
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('underline') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Sublinhado (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('strike') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Tachado"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Subscript/Superscript */}
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive('subscript') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => (editor.chain().focus() as any).toggleSubscript?.().run()}
          title="Subscrito"
        >
          <Subscript className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('superscript') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => (editor.chain().focus() as any).toggleSuperscript?.().run()}
          title="Sobrescrito"
        >
          <Superscript className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Colors */}
      <div className="flex items-center gap-1">
        <ColorPicker
          value={currentColor}
          onChange={(color) => (editor.chain().focus() as any).setColor?.(color).run()}
          label="Cor do Texto"
        />
        <ColorPicker
          value={currentHighlight}
          onChange={(color) => color ? (editor.chain().focus() as any).setHighlight?.({ color }).run() : (editor.chain().focus() as any).unsetHighlight?.().run()}
          label="Cor de Fundo"
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Alinhar à Esquerda"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Centralizar"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Alinhar à Direita"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Justificar"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista com Marcadores"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista Numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Insertions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onInsertImage}
          title="Inserir Imagem"
        >
          <Image className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onInsertTable}
          title="Inserir Tabela"
        >
          <Table className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onInsertPageBreak}
          title="Inserir Quebra de Página"
        >
          <FileText className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Fields */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleFields}
        className="gap-2"
      >
        <Code className="h-4 w-4" />
        Campos
      </Button>
    </div>
  );
}
