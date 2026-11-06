import { create } from "zustand";

/** Nog geen standaardtype in TypeScript: alleen Chromium-browsers kennen dit event. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isInstalled(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean })
    .standalone;
  return (
    iosStandalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

interface InstallState {
  /** Bewaard browservoorstel; zonder dit toont de app de uitleg met de hand. */
  prompt: BeforeInstallPromptEvent | null;
  installed: boolean;
  /** Geeft false terug als de browser niet zelf kan installeren. */
  install: () => Promise<boolean>;
}

export const useInstallStore = create<InstallState>((set, get) => ({
  prompt: null,
  installed: isInstalled(),
  install: async () => {
    const { prompt } = get();
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // Een voorstel werkt maar één keer.
    set({ prompt: null, installed: outcome === "accepted" });
    return true;
  },
}));

// Dit event komt kort na het laden, dus de luisteraar moet er meteen staan.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  useInstallStore.setState({ prompt: event as BeforeInstallPromptEvent });
});

window.addEventListener("appinstalled", () => {
  useInstallStore.setState({ prompt: null, installed: true });
});
