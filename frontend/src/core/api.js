const appBinding = () => window?.go?.main?.App;

function call(method, ...args) {
  const app = appBinding();
  if (!app || typeof app[method] !== 'function') {
    return Promise.reject(new Error(`Wails binding unavailable: App.${method}`));
  }
  return Promise.resolve(app[method](...args));
}

export const api = {
  getLauncherVersion: () => call('GetLauncherVersion'),
  checkForUpdates: () => call('CheckForUpdates'),
  getLocalVersion: () => call('GetLocalVersion'),
  startDownload: (url) => call('StartDownload', url),
  launchGame: () => call('LaunchGame'),
  openGameFolder: () => call('OpenGameFolder'),
  uninstallGame: () => call('UninstallGame'),
  minimize: () => call('Minimize'),
  close: () => call('Close'),
  openExternal: (url) => call('OpenExternal', url),
  checkLauncherUpdate: () => call('CheckLauncherUpdate'),
  downloadLauncherUpdate: () => call('DownloadLauncherUpdate'),
  installLauncherUpdate: () => call('InstallLauncherUpdate'),
};

export function onEvent(name, handler) {
  if (window.runtime?.EventsOn) return window.runtime.EventsOn(name, handler);
  console.warn(`Wails runtime unavailable for event: ${name}`);
  return undefined;
}
