# Modern Mermaid

Render latest Mermaid diagrams with support for light/dark themes and image copy functionality.

## Features

- Render Mermaid diagrams with the latest syntax
- Three code block types:
  - \`\`\`mer\`\`\` - Default theme with white background
  - \`\`\`merlight\`\`\` - Light theme with white background
  - \`\`\`merdark\`\`\` - Dark theme with black background
- Click the copy button to copy diagrams as PNG to clipboard
- Centered layout
- Ghost-style Lucide icons

## Usage

```mer
graph TD
    A[Start] --> B[End]
```

```merdark
graph LR
    A[Dark] --> B[Theme]
```

### Custom Width

You can set a custom width for the diagram by adding the width as the first line:

```mer
300
graph TD
    A[Start] --> B[End]
```

This will render the diagram with a width of 300px.

## Screenshots

![Modern Mermaid Demo 1](./mermaid-demo-1.png)
![Modern Mermaid Demo 2](./mermaid-demo-2.png)

## Credits

Built with [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
