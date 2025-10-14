import OrderedList from '@tiptap/extension-ordered-list';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    hierarchicalList: {
      setListFormat: (format: 'numeric' | 'legal' | 'alpha') => ReturnType;
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
    };
  }
}

export const HierarchicalOrderedList = OrderedList.extend({
  name: 'hierarchicalOrderedList',
  
  addAttributes() {
    return {
      ...this.parent?.(),
      level: {
        default: 1,
        parseHTML: element => {
          const level = element.getAttribute('data-level');
          return level ? parseInt(level) : 1;
        },
        renderHTML: attributes => ({
          'data-level': attributes.level,
          class: `hierarchical-list-level-${attributes.level}`,
        }),
      },
      format: {
        default: 'numeric',
        parseHTML: element => element.getAttribute('data-format') || 'numeric',
        renderHTML: attributes => ({
          'data-format': attributes.format,
        }),
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setListFormat: (format: 'numeric' | 'legal' | 'alpha') => ({ commands }) => {
        return commands.updateAttributes(this.name, { format });
      },
      increaseIndent: () => ({ commands, state }) => {
        const { $from } = state.selection;
        const listNode = $from.node(-2);
        
        if (listNode && listNode.type.name === this.name) {
          const currentLevel = listNode.attrs.level || 1;
          if (currentLevel < 6) {
            return commands.updateAttributes(this.name, { level: currentLevel + 1 });
          }
        }
        return false;
      },
      decreaseIndent: () => ({ commands, state }) => {
        const { $from } = state.selection;
        const listNode = $from.node(-2);
        
        if (listNode && listNode.type.name === this.name) {
          const currentLevel = listNode.attrs.level || 1;
          if (currentLevel > 1) {
            return commands.updateAttributes(this.name, { level: currentLevel - 1 });
          }
        }
        return false;
      },
    };
  },
});
