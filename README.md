# Window Manager

A quick-access Electron app that can be toggled with a global keyboard shortcut.

## Features

- **Global Keyboard Shortcut**: Press `Ctrl+Shift+Space` (or `Cmd+Shift+Space` on Mac) to toggle the window from anywhere
- **System Window Enumeration**: Get all currently open windows from any application on your system
- **Auto-hide on Blur**: Window automatically hides when you click away or focus on another application
- **Background Process**: The app continues running in the background for instant reopening
- **Always on Top**: Window stays on top of other applications when visible
- **Frameless Design**: Clean, modern interface without default window frame
- **Keyboard Navigation**: Navigate through window list with arrow keys

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

Once running, use `Ctrl+Shift+Space` (Windows/Linux) or `Cmd+Shift+Space` (Mac) to toggle the window.

## Customization

You can customize the keyboard shortcut by editing the key combination in [main.js:39](main.js#L39):

```javascript
globalShortcut.register('CommandOrControl+Shift+Space', () => {
  toggleWindow();
});
```

Available modifier keys:
- `CommandOrControl` - Cmd on Mac, Ctrl on Windows/Linux
- `Alt`
- `Shift`
- `Super` (Windows key)

## API

### getAllWindows()

Fetch all currently open windows from the system:

```javascript
const windows = await getAllWindows();
console.log(windows);
```

Returns an array of window objects:
```javascript
[
  {
    id: 12345,                    // Process ID
    title: "VSCode - script.js",  // Window title
    processName: "Code"            // Application name
  },
  ...
]
```

This function is available in [script.js](script.js#L7-L9) and can be called from your renderer process to get real-time window information.

## How it Works

The app creates a hidden browser window that:
1. Listens for a global keyboard shortcut
2. Shows and focuses the window when the shortcut is pressed
3. Hides the window when it loses focus (blur event)
4. Stays running in the background instead of truly closing
5. Can be instantly reopened with the shortcut
6. Uses PowerShell to enumerate all open windows from the operating system
