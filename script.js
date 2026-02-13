const { ipcRenderer } = require('electron');

let selectedIndex = 0;
let windowElements = [];

// --- Window Creation ---
async function createAllWindows() {
  return await ipcRenderer.invoke('get-windows');
}


// --- On Page Loaded ---
document.addEventListener('DOMContentLoaded', () => {
  console.log('Window Manager loaded');

  // Get all window elements
  windowElements = Array.from(document.querySelectorAll('.window'));

  // Create all windows
  createAllWindows()

  // Select the first window by default
  if (windowElements.length > 0) {
    updateSelection();
  }

  // Add keyboard event listener
  document.addEventListener('keydown', handleKeydown);
});


// --- Window Selection ---
function handleKeydown(event) {
  switch(event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % windowElements.length;
      updateSelection();
      break;

    case 'ArrowUp':
      event.preventDefault();
      selectedIndex = (selectedIndex - 1 + windowElements.length) % windowElements.length;
      updateSelection();
      break;

    case 'Enter':
      event.preventDefault();
      // TODO: Handle window selection/activation
      console.log(`Selected window: ${windowElements[selectedIndex].textContent}`);
      break;
  }
}

function updateSelection() {
  // Remove selection from all windows
  windowElements.forEach(el => el.classList.remove('selected'));

  // Add selection to current window
  if (windowElements[selectedIndex]) {
    windowElements[selectedIndex].classList.add('selected');
  }
}

