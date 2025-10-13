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
