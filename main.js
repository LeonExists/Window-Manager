const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Enable live reload in development
try {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
} catch (err) {
  // electron-reload not installed (production)
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 250,
    show: false, // Don't show immediately
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    // Optional: Make it frameless for a cleaner look
    frame: false,
    alwaysOnTop: true
  });

  mainWindow.loadFile('index.html');

  // Hide window when it loses focus
  mainWindow.on('blur', () => {
    mainWindow.hide();
  });

  // Prevent the window from being destroyed when closed
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function toggleWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

// Function to get all open windows using PowerShell (Alt+Tab visible windows only)
async function getAllWindows() {
  try {
    // PowerShell script to get only Alt+Tab visible windows
    const psScript = `
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
          [DllImport("user32.dll")]
          public static extern bool IsWindowVisible(IntPtr hWnd);
          [DllImport("user32.dll")]
          public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
          [DllImport("user32.dll")]
          public static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);
        }
"@
      \$GWL_EXSTYLE = -20
      \$WS_EX_TOOLWINDOW = 0x00000080
      \$WS_EX_APPWINDOW = 0x00040000
      \$GW_OWNER = 4

      Get-Process | Where-Object { \$_.MainWindowHandle -ne 0 } | ForEach-Object {
        \$hwnd = \$_.MainWindowHandle
        \$exStyle = [Win32]::GetWindowLong(\$hwnd, \$GWL_EXSTYLE)
        \$owner = [Win32]::GetWindow(\$hwnd, \$GW_OWNER)
        \$isVisible = [Win32]::IsWindowVisible(\$hwnd)
        \$isToolWindow = (\$exStyle -band \$WS_EX_TOOLWINDOW) -ne 0
        \$isAppWindow = (\$exStyle -band \$WS_EX_APPWINDOW) -ne 0

        if (\$isVisible -and \$_.MainWindowTitle -ne '' -and ((\$owner -eq [IntPtr]::Zero -and -not \$isToolWindow) -or \$isAppWindow)) {
          [PSCustomObject]@{
            Id = \$_.Id
            ProcessName = \$_.ProcessName
            MainWindowTitle = \$_.MainWindowTitle
          }
        }
      } | ConvertTo-Json
    `;

    const { stdout } = await execPromise(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`);

    if (!stdout.trim()) {
      return [];
    }

    const windows = JSON.parse(stdout);

    // Ensure it's always an array (single result might not be an array)
    const windowList = Array.isArray(windows) ? windows : [windows];

    return windowList.map(win => ({
      id: win.Id,
      title: win.MainWindowTitle,
      processName: win.ProcessName
    }));
  } catch (error) {
    console.error('Error getting windows:', error);
    return [];
  }
}

// IPC handler to get all windows
ipcMain.handle('get-windows', async () => {
  return await getAllWindows();
});

app.whenReady().then(() => {
  createWindow();

  // Register global shortcut (Ctrl+Shift+Space)
  // You can change this to any key combination you prefer
  const ret = globalShortcut.register('CommandOrControl+Shift+Space', () => {
    toggleWindow();
  });

  if (!ret) {
    console.log('Registration failed');
  }

  console.log('Global shortcut registered: Ctrl+Shift+Space (or Cmd+Shift+Space on Mac)');
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app quit
app.on('before-quit', () => {
  app.isQuitting = true;
});

// Unregister all shortcuts when app quits
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
