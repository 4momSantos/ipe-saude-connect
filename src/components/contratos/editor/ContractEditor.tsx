import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Link } from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { common, createLowlight } from "lowlight";
import { useDropzone } from "react-dropzone";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { FontSize } from "./extensions/FontSize";
import { PageBreak } from "./extensions/PageBreak";
import { ResizableImage, TableWithBorder } from "./extensions/ResizableImage";
import { SlashCommands } from "./extensions/SlashCommands";
import { Callout } from "./extensions/Callout";
import { HierarchicalOrderedList } from "./extensions/HierarchicalList";
import { LineHeight } from "./extensions/LineHeight";
import { ParagraphSpacing } from "./extensions/ParagraphSpacing";
import { TabStops } from "./extensions/TabStops";
import { AdvancedToolbar } from "./toolbar/AdvancedToolbar";
import { FieldsPanel } from "./FieldsPanel";
import { ContractPreview } from "./ContractPreview";
import { ImageUploadDialog } from "./ImageUploadDialog";
import { FloatingToolbar } from "./components/FloatingToolbar";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { PagedDocument } from "./PagedDocument";
import { PagedEditor } from "./PagedEditor";
import { PageNumberSettings } from "./PageNumberSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Eye, Edit, Save, Keyboard, Maximize2, Minimize2, 
  FileText, Loader2, Check 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ContractField, AvailableField } from "@/types/contract-editor";
import "./print-styles.css";
import "./image-resize.css";
import "./editor-styles.css";
import "./table-styles.css";
import "./hierarchical-lists.css";

const lowlight = createLowlight(common);

interface ContractEditorProps {
  initialContent?: string;
  initialHeader?: string;
  initialFooter?: string;
  onSave: (html: string, campos: ContractField[], header?: string, footer?: string) => Promise<void>;
  isSaving?: boolean;
  templateName?: string;
  onTemplateNameChange?: (name: string) => void;
}

export function ContractEditor({ 
  initialContent, 
  initialHeader,
  initialFooter,
  onSave, 
  isSaving = false,
  templateName = "Documento sem título",
  onTemplateNameChange
}: ContractEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showFields, setShowFields] = useState(true);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [activeSection, setActiveSection] = useState<"header" | "content" | "footer">("content");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [pageNumberPosition, setPageNumberPosition] = useState<'left' | 'center' | 'right'>('center');
  const [pageNumberFormat, setPageNumberFormat] = useState('Página {n} de {total}');
  const [startNumber, setStartNumber] = useState(1);
  const [pageNumberFontFamily, setPageNumberFontFamily] = useState('Arial');
  const [pageNumberFontSize, setPageNumberFontSize] = useState(10);
  const { toast } = useToast();

  // Editor principal (conteúdo)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
        strike: false,
        orderedList: false, // Desabilitar lista padrão
      }),
      HierarchicalOrderedList, // Lista hierárquica customizada
      ResizableImage,
      TableWithBorder.configure({ 
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 50,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      TextAlign.configure({ 
        types: ["heading", "paragraph", "div", "blockquote", "codeBlock"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left"
      }),
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      Subscript,
      Superscript,
      Link.configure({ 
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline'
        }
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: "Digite / para ver os comandos..." }),
      CharacterCount,
      FontSize,
      PageBreak,
      SlashCommands,
      Callout,
      LineHeight.configure({
        types: ['paragraph', 'heading'],
        defaultLineHeight: '1.5',
      }),
      ParagraphSpacing.configure({
        types: ['paragraph', 'heading'],
      }),
      TabStops,
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4",
      },
      handleDOMEvents: {
        mousedown: (view, event) => {
          const target = event.target as HTMLElement;
          // Permitir interação com handles de redimensionamento de tabela
          if (target.classList.contains('column-resize-handle') || 
              target.classList.contains('react-resizable-handle')) {
            return false;
          }
          return false;
        },
      },
    },
  });

  // Editor de cabeçalho
  const headerEditor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      ResizableImage,
      TextAlign.configure({ 
        types: ["heading", "paragraph", "div", "blockquote"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left"
      }),
      TextStyle,
      FontFamily,
      Color,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Cabeçalho do documento..." }),
    ],
    content: initialHeader || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[100px] p-4 border-b",
      },
    },
  });

  // Editor de rodapé
  const footerEditor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      ResizableImage,
      TextAlign.configure({ 
        types: ["heading", "paragraph", "div", "blockquote"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left"
      }),
      TextStyle,
      FontFamily,
      Color,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Rodapé do documento..." }),
    ],
    content: initialFooter || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[100px] p-4 border-t",
      },
    },
  });

  // Drag & Drop de imagens
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    },
    onDrop: async (acceptedFiles) => {
      for (const file of acceptedFiles) {
        try {
          const url = await uploadImageToSupabase(file);
          editor?.chain().focus().setImage({ src: url }).run();
          toast({
            title: "Imagem inserida",
            description: "A imagem foi adicionada ao documento.",
          });
        } catch (error) {
          toast({
            title: "Erro ao fazer upload",
            description: "Não foi possível fazer upload da imagem.",
            variant: "destructive",
          });
        }
      }
    },
    noClick: true,
    noKeyboard: true,
  });

  // Upload de imagem para Supabase
  const uploadImageToSupabase = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("contract-images")
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("contract-images")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // Paste de imagem (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          event.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            try {
              const url = await uploadImageToSupabase(file);
              editor?.chain().focus().setImage({ src: url }).run();
              toast({
                title: "Imagem colada",
                description: "A imagem foi adicionada ao documento.",
              });
            } catch (error) {
              toast({
                title: "Erro ao colar imagem",
                description: "Não foi possível colar a imagem.",
                variant: "destructive",
              });
            }
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [editor, toast]);

  // Auto-save
  useEffect(() => {
    if (!editor || !headerEditor || !footerEditor) return;

    const autoSaveInterval = setInterval(async () => {
      const currentContent = editor.getHTML();
      const currentHeader = headerEditor.getHTML();
      const currentFooter = footerEditor.getHTML();

      if (
        currentContent !== initialContent ||
        currentHeader !== initialHeader ||
        currentFooter !== initialFooter
      ) {
        setSaveStatus("saving");
        try {
          await handleSave();
          setSaveStatus("saved");
          setLastSaved(new Date());
        } catch (error) {
          setSaveStatus("error");
        }
      }
    }, 10000);

    return () => clearInterval(autoSaveInterval);
  }, [editor, headerEditor, footerEditor, initialContent, initialHeader, initialFooter]);

  // Aplicar cores de borda dinamicamente nas tabelas
  useEffect(() => {
    if (!editor) return;

    const updateTableBorders = () => {
      const editorElement = editor.view.dom;
      const tables = editorElement.querySelectorAll('table[data-border-color]');
      
      tables.forEach((table) => {
        const borderColor = table.getAttribute('data-border-color');
        const borderWidth = table.getAttribute('data-border-width') || '1';
        
        if (borderColor) {
          (table as HTMLElement).style.borderColor = borderColor;
          
          // Aplicar também nas células
          const cells = table.querySelectorAll('td, th');
          cells.forEach((cell) => {
            (cell as HTMLElement).style.borderColor = borderColor;
            (cell as HTMLElement).style.borderWidth = `${borderWidth}px`;
          });
        }
      });
    };

    // Executar na inicialização e a cada atualização
    updateTableBorders();
    editor.on('update', updateTableBorders);
    
    return () => {
      editor.off('update', updateTableBorders);
    };
  }, [editor]);

  // Atalho Ctrl+K para abrir shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Aplicar cores de borda das tabelas dinamicamente
  useEffect(() => {
    if (!editor) return;

    const applyTableBorderStyles = () => {
      const tables = document.querySelectorAll('.ProseMirror table[data-border-color]');
      tables.forEach((table: Element) => {
        const htmlTable = table as HTMLElement;
        const borderColor = htmlTable.getAttribute('data-border-color');
        if (borderColor) {
          htmlTable.style.borderColor = borderColor;
          // Aplicar também nas células
          const cells = htmlTable.querySelectorAll('td, th');
          cells.forEach((cell: Element) => {
            (cell as HTMLElement).style.borderColor = borderColor;
          });
        }
      });
    };

    // Aplicar ao montar e em cada atualização
    applyTableBorderStyles();
    editor.on('update', applyTableBorderStyles);

    return () => {
      editor.off('update', applyTableBorderStyles);
    };
  }, [editor]);

  const handleInsertField = (field: AvailableField) => {
    if (!editor) return;
    const fieldPlaceholder = `{{${field.id}}}`;
    editor.chain().focus().insertContent(fieldPlaceholder).run();
  };

  const handleInsertImage = async (url: string, alt: string, width?: number) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src: url, alt, width }).run();
    setImageDialogOpen(false);
  };

  const handleInsertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleInsertPageBreak = () => {
    if (!editor) return;
    editor.chain().focus().insertPageBreak().run();
  };

  const handleSave = async () => {
    if (!editor || !headerEditor || !footerEditor) return;

    const html = editor.getHTML();
    const headerHtml = headerEditor.getHTML();
    const footerHtml = footerEditor.getHTML();

    const regex = /\{\{([^}]+)\}\}/g;
    const matches = html.match(regex) || [];
    const uniqueFields = [...new Set(matches)];

    const campos: ContractField[] = uniqueFields.map((placeholder) => {
      const fieldName = placeholder.replace(/[{}]/g, "");
      return {
        id: fieldName,
        nome: fieldName,
        label: fieldName,
        tipo: "text",
        origem: "custom" as const,
        caminho: fieldName,
      };
    });

    await onSave(html, campos, headerHtml, footerHtml);
  };

  if (!editor || !headerEditor || !footerEditor) {
    return <div>Carregando editor...</div>;
  }

  const currentEditor = activeSection === "header" ? headerEditor : 
                        activeSection === "footer" ? footerEditor : editor;

  const wordCount = editor.storage.characterCount.words();
  const charCount = editor.storage.characterCount.characters();
  const estimatedPages = Math.ceil(wordCount / 250);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* HEADER FIXO - ESTILO GOOGLE DOCS */}
      {!focusMode && (
        <div 
          className="fixed top-0 right-0 z-50 bg-white border-b shadow-sm h-[60px] flex items-center px-4 justify-between gap-2"
          style={{ 
            left: 'var(--sidebar-width, 0px)',
          }}
        >
          {/* Título editável inline */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <input
              type="text"
              value={templateName}
              onChange={(e) => onTemplateNameChange?.(e.target.value)}
              className="text-lg font-medium bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded flex-1 min-w-0"
              placeholder="Documento sem título"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList>
                <TabsTrigger value="edit">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === "edit" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFields(!showFields)}
              >
                <FileText className="h-4 w-4 mr-2" />
                {showFields ? "Ocultar" : "Mostrar"} Campos
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFocusMode(!focusMode)}
            >
              {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShortcutsOpen(true)}
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground flex gap-4">
              <span>{wordCount} palavras</span>
              <span>{charCount} caracteres</span>
              <span>{estimatedPages} páginas</span>
            </div>

            <div className="save-indicator text-sm">
              {saveStatus === "saving" && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando...
                </span>
              )}
              {saveStatus === "saved" && lastSaved && (
                <span className="text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Salvo {formatDistanceToNow(lastSaved, { locale: ptBR, addSuffix: true })}
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-destructive">Erro ao salvar</span>
              )}
            </div>

            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
            
            <PageNumberSettings
              showPageNumbers={showPageNumbers}
              position={pageNumberPosition}
              format={pageNumberFormat}
              startNumber={startNumber}
              fontFamily={pageNumberFontFamily}
              fontSize={pageNumberFontSize}
              onShowChange={setShowPageNumbers}
              onPositionChange={setPageNumberPosition}
              onFormatChange={setPageNumberFormat}
              onStartNumberChange={setStartNumber}
              onFontFamilyChange={setPageNumberFontFamily}
              onFontSizeChange={setPageNumberFontSize}
            />
          </div>
        </div>
      )}

      {/* TOOLBAR FIXA */}
      {mode === "edit" && !focusMode && (
        <div 
          className="fixed top-[60px] right-0 z-40 bg-white border-b shadow-sm"
          style={{ 
            left: 'var(--sidebar-width, 0px)',
          }}
        >
          <AdvancedToolbar
            editor={currentEditor}
            onInsertImage={() => setImageDialogOpen(true)}
            onInsertTable={handleInsertTable}
            onInsertPageBreak={handleInsertPageBreak}
            onToggleFields={() => setShowFields(!showFields)}
          />
        </div>
      )}

      {/* ÁREA DE CONTEÚDO SCROLLÁVEL */}
      <main 
        className="flex-1 overflow-y-auto bg-gray-50"
        style={{ 
          marginTop: focusMode ? '0' : '108px', // 60px header + 48px toolbar
          marginLeft: 'var(--sidebar-width, 0px)',
        }}
      >
        <div 
          className="relative contract-editor-workspace"
          style={{
            transition: 'margin-left 0.2s ease',
          }}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          
          {isDragActive && (
            <div className="fixed inset-0 bg-primary/10 border-4 border-dashed border-primary z-50 flex items-center justify-center">
              <div className="text-2xl font-bold text-primary">
                Solte a imagem aqui...
              </div>
            </div>
          )}

          {mode === "edit" ? (
            <PagedEditor
              editor={editor}
              headerEditor={headerEditor}
              footerEditor={footerEditor}
              showPageNumbers={showPageNumbers}
              pageNumberPosition={pageNumberPosition}
              pageNumberFormat={pageNumberFormat}
              startNumber={startNumber}
              fontFamily={pageNumberFontFamily}
              fontSize={pageNumberFontSize}
            />
          ) : (
            <PagedDocument
              headerContent={headerEditor?.getHTML()}
              footerContent={footerEditor?.getHTML()}
              showPageNumbers={showPageNumbers}
              pageNumberPosition={pageNumberPosition}
              pageNumberFormat={pageNumberFormat}
            >
              <div dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }} />
            </PagedDocument>
          )}
        </div>
      </main>

      {/* FIELDS PANEL FIXO (DIREITA) */}
      {mode === "edit" && showFields && !focusMode && (
        <div 
          className="fixed right-0 top-[108px] bottom-0 w-80 bg-white border-l shadow-lg overflow-y-auto z-30"
        >
          <FieldsPanel onInsertField={handleInsertField} />
        </div>
      )}

      <ImageUploadDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onInsert={handleInsertImage}
      />

      <KeyboardShortcuts
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </div>
  );
}
