import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tabStops: {
      setTabStops: (tabs: number[]) => ReturnType;
    };
  }
}

export const TabStops = Extension.create({
  name: 'tabStops',
  
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          tabStops: {
            default: null,
            parseHTML: element => element.getAttribute('data-tab-stops'),
            renderHTML: attributes => {
              if (!attributes.tabStops) return {};
              return { 'data-tab-stops': attributes.tabStops };
            },
          },
        },
      },
    ];
  },
  
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        return this.editor.commands.insertContent('\t');
      },
    };
  },
  
  addCommands() {
    return {
      setTabStops: (tabs: number[]) => ({ commands }) => {
        return commands.updateAttributes('paragraph', { tabStops: JSON.stringify(tabs) });
      },
    };
  },
});
