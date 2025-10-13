import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { type?: string }) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  
  addAttributes() {
    return {
      type: {
        default: 'info', // info, warning, error, success
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 
      'data-type': 'callout',
      class: `callout callout-${HTMLAttributes.type} p-4 my-4 rounded-md border-l-4`
    }), 0];
  },

  addCommands() {
    return {
      setCallout: (attributes) => ({ commands }) => {
        return commands.setNode(this.name, attributes);
      },
    };
  },
});
