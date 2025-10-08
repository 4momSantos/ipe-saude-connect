import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Image as ImageIcon,
  Table as TableIcon,
  Save
} from "lucide-react";
import { camposDisponiveis, ContractField } from "@/types/contract-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ContractEditorProps {
  initialContent?: string;
  onSave: (html: string, campos: ContractField[]) => void;
  isSaving?: boolean;
}

export function ContractEditor({ initialContent = "", onSave, isSaving }: ContractEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-8",
      },
    },
  });

  if (!editor) {
    return null;
  }

  const insertarCampo = (campo: ContractField) => {
    const placeholder = `{{${campo.nome}}}`;
    editor.chain().focus().insertContent(placeholder).run();
  };

  const inserirImagem = () => {
    const url = window.prompt("URL da imagem:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const inserirTabela = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleSave = () => {
    const html = editor.getHTML();
    
    // Extrair campos mapeados do HTML
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
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
      {/* Sidebar - Campos Disponíveis */}
      <div className="col-span-3">
        <Card className="p-4 h-full">
          <h3 className="font-semibold mb-4">Campos Disponíveis</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Clique em um campo para inseri-lo no contrato
          </p>
          <ScrollArea className="h-[calc(100%-80px)]">
            <div className="space-y-4">
              {["candidato", "edital", "contrato", "sistema"].map((categoria) => (
                <div key={categoria}>
                  <h4 className="text-sm font-medium mb-2 capitalize">{categoria}</h4>
                  <div className="space-y-1">
                    {camposDisponiveis
                      .filter((c) => c.categoria === categoria)
                      .map((campo) => (
                        <Button
                          key={campo.id}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => insertarCampo(campo.campo)}
                        >
                          {campo.label}
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {campo.preview}
                          </Badge>
                        </Button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Editor Principal */}
      <div className="col-span-9">
        <Card className="h-full flex flex-col">
          {/* Toolbar */}
          <div className="border-b p-2">
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive("bold") ? "bg-accent" : ""}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive("italic") ? "bg-accent" : ""}
              >
                <Italic className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="mx-1 h-8" />

              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive("bulletList") ? "bg-accent" : ""}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive("orderedList") ? "bg-accent" : ""}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="mx-1 h-8" />

              <Button size="sm" variant="ghost" onClick={inserirImagem}>
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={inserirTabela}>
                <TableIcon className="h-4 w-4" />
              </Button>

              <div className="flex-1" />

              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Template"}
              </Button>
            </div>
          </div>

          {/* Área de Edição */}
          <ScrollArea className="flex-1">
            <EditorContent editor={editor} />
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
