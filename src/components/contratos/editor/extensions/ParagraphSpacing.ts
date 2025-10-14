import { Extension } from '@tiptap/core';

export interface ParagraphSpacingOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      /**
       * Set paragraph spacing before
       */
      setSpaceBefore: (space: string) => ReturnType;
      /**
       * Set paragraph spacing after
       */
      setSpaceAfter: (space: string) => ReturnType;
      /**
       * Unset paragraph spacing
       */
      unsetParagraphSpacing: () => ReturnType;
    };
  }
}

export const ParagraphSpacing = Extension.create<ParagraphSpacingOptions>({
  name: 'paragraphSpacing',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          spaceBefore: {
            default: null,
            parseHTML: element => {
              const marginTop = element.style.marginTop;
              return marginTop || null;
            },
            renderHTML: attributes => {
              if (!attributes.spaceBefore) {
                return {};
              }

              return {
                style: `margin-top: ${attributes.spaceBefore}pt`,
              };
            },
          },
          spaceAfter: {
            default: null,
            parseHTML: element => {
              const marginBottom = element.style.marginBottom;
              return marginBottom || null;
            },
            renderHTML: attributes => {
              if (!attributes.spaceAfter) {
                return {};
              }

              return {
                style: `margin-bottom: ${attributes.spaceAfter}pt`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setSpaceBefore: (space: string) => ({ commands }) => {
        return this.options.types.every(type =>
          commands.updateAttributes(type, { spaceBefore: space })
        );
      },
      setSpaceAfter: (space: string) => ({ commands }) => {
        return this.options.types.every(type =>
          commands.updateAttributes(type, { spaceAfter: space })
        );
      },
      unsetParagraphSpacing: () => ({ commands }) => {
        return this.options.types.every(type => {
          commands.resetAttributes(type, 'spaceBefore');
          return commands.resetAttributes(type, 'spaceAfter');
        });
      },
    };
  },
});
