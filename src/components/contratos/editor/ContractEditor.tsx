import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Link from "@tiptap/extension-link";
import { FontSize } from "./extensions/FontSize";
import { PageBreak } from "./extensions/PageBreak";
import { AdvancedToolbar } from "./toolbar/AdvancedToolbar";
import { FieldsPanel } from "./FieldsPanel";
import { ImageUploadDialog } from "./ImageUploadDialog";
import { ContractPreview } from "./ContractPreview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Eye, Edit } from "lucide-react";
import { camposDisponiveis, ContractField, type AvailableField } from "@/types/contract-editor";

interface ContractEditorProps {
  initialContent?: string;
  onSave: (html: string, campos: ContractField[]) => void;
  isSaving?: boolean;
}

export function ContractEditor({ initialContent = "", onSave, isSaving }: ContractEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showFields, setShowFields] = useState(true);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      Subscript,
      Superscript,
      Link,
      FontSize,
      PageBreak,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[500px] p-8',
      },
    },
  });

  if (!editor) return null;

  const handleInsertField = (field: AvailableField) => {
    editor.chain().focus().insertContent(`<span class="contract-field bg-primary/10 px-2 py-1 rounded font-mono text-sm">{{${field.id}}}</span>`).run();
  };

  const handleInsertImage = (url: string, alt: string, width?: number) => {
    editor.chain().focus().setImage({ src: url, alt }).run();
  };

  const handleInsertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleInsertPageBreak = () => {
    (editor.chain().focus() as any).insertPageBreak?.().run();
  };

  const handleSave = () => {
    const html = editor.getHTML();
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = html.match(regex) || [];
    const camposUsados = matches.map(match => {
      const nomeCampo = match.replace(/\{\{|\}\}/g, "");
      const campo = camposDisponiveis.find(c => c.id === nomeCampo);
      return campo?.campo;
    }).filter(Boolean) as ContractField[];

    onSave(html, camposUsados);
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {showFields && mode === "edit" && (
        <div className="w-[280px] flex-shrink-0">
          <FieldsPanel onInsertField={handleInsertField} />
        </div>
      )}

      <div className="flex-1 flex flex-col gap-4">
        <Card className="p-3 flex items-center justify-between">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "edit" | "preview")}>
            <TabsList>
              <TabsTrigger value="edit" className="gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Visualizar
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Template"}
          </Button>
        </Card>

        {mode === "edit" ? (
          <Card className="flex-1 flex flex-col overflow-hidden">
            <AdvancedToolbar
              editor={editor}
              onInsertImage={() => setImageDialogOpen(true)}
              onInsertTable={handleInsertTable}
              onInsertPageBreak={handleInsertPageBreak}
              onToggleFields={() => setShowFields(!showFields)}
            />
            <div className="flex-1 overflow-auto">
              <EditorContent editor={editor} />
            </div>
          </Card>
        ) : (
          <ContractPreview content={editor.getHTML()} className="flex-1 overflow-auto" />
        )}
      </div>

      <ImageUploadDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onInsert={handleInsertImage}
      />
    </div>
  );
}
