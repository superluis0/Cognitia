interface Settings {
  enabled: boolean;
  backendUrl: string;
  xApiToken?: string;
}

const DEFAULT_BACKEND_URL = 'http://localhost:3001';

async function loadSettings(): Promise<void> {
  const result = await chrome.storage.sync.get(['cognitiaSettings']);
  const settings: Settings = result.cognitiaSettings || {
    enabled: true,
    backendUrl: DEFAULT_BACKEND_URL
  };
  
  const enabledEl = document.getElementById('enabled') as HTMLInputElement;
  const backendUrlEl = document.getElementById('backendUrl') as HTMLInputElement;
  const xApiTokenEl = document.getElementById('xApiToken') as HTMLInputElement;
  
  enabledEl.checked = settings.enabled;
  backendUrlEl.value = settings.backendUrl || DEFAULT_BACKEND_URL;
  xApiTokenEl.value = settings.xApiToken || '';
}

async function saveSettings(): Promise<void> {
  const enabledEl = document.getElementById('enabled') as HTMLInputElement;
  const backendUrlEl = document.getElementById('backendUrl') as HTMLInputElement;
  const xApiTokenEl = document.getElementById('xApiToken') as HTMLInputElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const statusEl = document.getElementById('status') as HTMLElement;
  
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  const settings: Settings = {
    enabled: enabledEl.checked,
    backendUrl: backendUrlEl.value.trim() || DEFAULT_BACKEND_URL,
    xApiToken: xApiTokenEl.value.trim() || undefined
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
});
