interface Settings {
  enabled: boolean;
  backendUrl: string;
  highlightStyle: string;
}

const DEFAULT_BACKEND_URL = 'http://localhost:3001';

async function loadSettings(): Promise<void> {
  const result = await chrome.storage.sync.get(['cognitiaSettings']);
  const settings: Settings = result.cognitiaSettings || {
    enabled: true,
    backendUrl: DEFAULT_BACKEND_URL,
    highlightStyle: 'dotted'
  };
  
  const enabledEl = document.getElementById('enabled') as HTMLInputElement;
  const highlightStyleEl = document.getElementById('highlightStyle') as HTMLSelectElement;
  
  enabledEl.checked = settings.enabled;
  highlightStyleEl.value = settings.highlightStyle || 'dotted';
  
  updatePreview(settings.highlightStyle || 'dotted');
}

function updatePreview(style: string): void {
  console.log('[Cognitia] updatePreview called with style:', style);
  const preview = document.getElementById('previewHighlight');
  console.log('[Cognitia] preview element:', preview);
  if (preview) {
    preview.className = 'preview-highlight ' + style;
    console.log('[Cognitia] new className:', preview.className);
  }
}

async function saveSettings(): Promise<void> {
  const enabledEl = document.getElementById('enabled') as HTMLInputElement;
  const highlightStyleEl = document.getElementById('highlightStyle') as HTMLSelectElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const statusEl = document.getElementById('status') as HTMLElement;
  
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  const settings: Settings = {
    enabled: enabledEl.checked,
    backendUrl: DEFAULT_BACKEND_URL,
    highlightStyle: highlightStyleEl.value
  };
  
  try {
    await chrome.storage.sync.set({ cognitiaSettings: settings });
    
    statusEl.className = 'status success';
    statusEl.textContent = 'Settings saved successfully!';
    
    setTimeout(() => {
      statusEl.className = 'status';
    }, 3000);
  } catch (error) {
    statusEl.className = 'status error';
    statusEl.textContent = 'Failed to save settings.';
    
    setTimeout(() => {
      statusEl.className = 'status';
    }, 3000);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Settings';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  const saveBtn = document.getElementById('saveBtn');
  saveBtn?.addEventListener('click', saveSettings);
  
  const highlightStyleEl = document.getElementById('highlightStyle') as HTMLSelectElement;
  if (highlightStyleEl) {
    const onStyleChange = () => {
      updatePreview(highlightStyleEl.value);
    };
    highlightStyleEl.addEventListener('change', onStyleChange);
    highlightStyleEl.addEventListener('input', onStyleChange);
  }
});
