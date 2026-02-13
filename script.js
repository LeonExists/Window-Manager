const { ipcRenderer } = require('electron');

let selectedIndex = 0;
let windowElements = [];

// --- Window Creation ---
async function createAllWindows() {
  const windows = await ipcRenderer.invoke('get-windows');

  // get the container
  const container = document.querySelector('.windows');

  // clear existing windows
  container.innerHTML = '';

  // create window elements
  windows.forEach((window, index) => {
    const windowEl = document.createElement('p');
    windowEl.className = 'window';
    windowEl.textContent = `${window.title} (${window.processName})`;
    windowEl.dataset.windowId = window.id;
    container.appendChild(windowEl);
  });

  // update the windowElements array
  windowElements = Array.from(document.querySelectorAll('.window'));

  // select first window by default
  if (windowElements.length > 0) {
    selectedIndex = 0;
    updateSelection();
  }
}


// --- On Page Loaded ---
document.addEventListener('DOMContentLoaded', async () => {
  // Create all windows
  await createAllWindows();

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
  windowElements.forEach(el => el.classList.remove('selected'));

  if (windowElements[selectedIndex]) {
    windowElements[selectedIndex].classList.add('selected');
  }
}

