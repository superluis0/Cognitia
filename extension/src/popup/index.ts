interface Settings {
  enabled: boolean;
  backendUrl: string;
  highlightStyle: string;
}

const DEFAULT_BACKEND_URL = 'http://localhost:3001';
let currentStyle = 'dotted';

async function loadSettings(): Promise<void> {
  const result = await chrome.storage.sync.get(['cognitiaSettings']);
  const settings: Settings = result.cognitiaSettings || {
    enabled: true,
    backendUrl: DEFAULT_BACKEND_URL,
    highlightStyle: 'dotted'
  };
  
  const enabledEl = document.getElementById('enabled') as HTMLInputElement;
  enabledEl.checked = settings.enabled;
  
  currentStyle = settings.highlightStyle || 'dotted';
  updateSwatchSelection(currentStyle);
  updatePreview(currentStyle);
}

function updateSwatchSelection(style: string): void {
  const swatches = document.querySelectorAll('.style-swatch');
  swatches.forEach(swatch => {
    const swatchStyle = swatch.getAttribute('data-style');
    if (swatchStyle === style) {
      swatch.classList.add('active');
    } else {
      swatch.classList.remove('active');
    }
  });
}

function updatePreview(style: string): void {
  const preview = document.getElementById('previewHighlight');
  if (preview) {
    preview.className = 'preview-highlight ' + style;
  }
}

function selectStyle(style: string): void {
  currentStyle = style;
  updateSwatchSelection(style);
  updatePreview(style);
}

async function saveSettings(): Promise<void> {
  const enabledEl = document.getElementById('enabled') as HTMLInputElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const statusEl = document.getElementById('status') as HTMLElement;
  
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  const settings: Settings = {
    enabled: enabledEl.checked,
    backendUrl: DEFAULT_BACKEND_URL,
    highlightStyle: currentStyle
  };
  
  try {
    await chrome.storage.sync.set({ cognitiaSettings: settings });
    
    statusEl.className = 'status success';
    statusEl.textContent = 'Settings saved!';
    
    setTimeout(() => {
      statusEl.className = 'status';
    }, 2000);
  } catch (error) {
    statusEl.className = 'status error';
    statusEl.textContent = 'Failed to save.';
    
    setTimeout(() => {
      statusEl.className = 'status';
    }, 2000);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Settings';
  }
}

async function openGrokChat(): Promise<void> {
  chrome.runtime.sendMessage({ type: 'OPEN_GENERAL_CHAT' });
  window.close();
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  const saveBtn = document.getElementById('saveBtn');
  saveBtn?.addEventListener('click', saveSettings);

  const chatBtn = document.getElementById('chatBtn');
  chatBtn?.addEventListener('click', openGrokChat);

  const closeBtn = document.getElementById('closeBtn');
  closeBtn?.addEventListener('click', () => {
    window.close();
  });

  // Handle swatch clicks
  const swatches = document.querySelectorAll('.style-swatch');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      const style = swatch.getAttribute('data-style');
      if (style) {
        selectStyle(style);
      }
    });
  });
});
