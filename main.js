const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const os = require('os');
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
    // This matches Windows Alt+Tab behavior by filtering:
    // 1. Must be visible
    // 2. Must have a title
    // 3. Must not be a tool window (unless it has WS_EX_APPWINDOW)
    // 4. Must not have an owner (unless it has WS_EX_APPWINDOW)
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
  [DllImport("user32.dll")]
  public static extern IntPtr GetLastActivePopup(IntPtr hWnd);
}
"@

$GWL_EXSTYLE = -20
$WS_EX_TOOLWINDOW = 0x00000080
$WS_EX_APPWINDOW = 0x00040000
$GW_OWNER = 4

$results = @()

Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne '' } | ForEach-Object {
  $hwnd = $_.MainWindowHandle

  # Get window properties
  $exStyle = [Win32]::GetWindowLong($hwnd, $GWL_EXSTYLE)
  $owner = [Win32]::GetWindow($hwnd, $GW_OWNER)
  $isVisible = [Win32]::IsWindowVisible($hwnd)
  $isToolWindow = ($exStyle -band $WS_EX_TOOLWINDOW) -ne 0
  $isAppWindow = ($exStyle -band $WS_EX_APPWINDOW) -ne 0

  # Alt+Tab logic: Show if visible AND has title AND (no owner AND not tool window) OR has app window style
  $showInAltTab = $isVisible -and (
    ($owner -eq [IntPtr]::Zero -and -not $isToolWindow) -or $isAppWindow
  )

  if ($showInAltTab) {
    $results += [PSCustomObject]@{
      Id = $_.Id
      ProcessName = $_.ProcessName
      MainWindowTitle = $_.MainWindowTitle
    }
  }
}

if ($results.Count -gt 0) {
  $results | ConvertTo-Json
} else {
  '[]'
}
`;

    // Write script to temp file to avoid command line quote issues
    const tempFile = path.join(os.tmpdir(), 'get-windows.ps1');
    fs.writeFileSync(tempFile, psScript);

    const { stdout } = await execPromise(`powershell -ExecutionPolicy Bypass -File "${tempFile}"`);

    // Clean up temp file
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }

    if (!stdout.trim() || stdout.trim() === '[]') {
      return [];
    }

    const windows = JSON.parse(stdout);

    // Ensure it's always an array (single result might not be an array)
    const windowList = Array.isArray(windows) ? windows : [windows];

    console.log(`Found ${windowList.length} Alt+Tab visible windows`);

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
