import { Image } from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageResizeComponent } from '../nodes/ImageResizeComponent';

export const ResizableImage = Image.extend({
  name: 'resizableImage',
  
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width}px` };
        },
      },
      height: {
        default: null,
      },
      align: {
        default: 'center',
        renderHTML: attributes => {
          return { 'data-align': attributes.align };
        },
      },
      caption: {
        default: '',
      },
      link: {
        default: null,
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageResizeComponent);
  },
});

// Estender Table para suportar atributos de borda
import { Table as TiptapTable } from '@tiptap/extension-table';

export const TableWithBorder = TiptapTable.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borderWidth: {
        default: 1,
        parseHTML: element => element.getAttribute('data-border-width') || 1,
        renderHTML: attributes => {
          return { 'data-border-width': attributes.borderWidth };
        },
      },
      borderColor: {
        default: '#e5e7eb',
        parseHTML: element => element.getAttribute('data-border-color') || '#e5e7eb',
        renderHTML: attributes => {
          return { 'data-border-color': attributes.borderColor };
        },
      },
    };
  },
});
