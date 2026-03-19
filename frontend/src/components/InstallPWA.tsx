import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isStandalone = useMemo(() => {
    const displayMode = window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safariStandalone = (window as any).navigator?.standalone ?? false;
    return Boolean(displayMode || safariStandalone);
  }, []);

  const isMobile = useMemo(() => {
    const ua = navigator.userAgent || "";
    return /Android|iPhone|iPad|iPod/i.test(ua);
  }, []);

  useEffect(() => {
    const key = "pwa_install_dismissed";
    setDismissed(localStorage.getItem(key) === "1");

    const onBeforeInstallPrompt = (e: Event) => {
      const evt = e as BeforeInstallPromptEvent;
      e.preventDefault();
      setDeferredPrompt(evt);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      localStorage.setItem(key, "1");
      setDismissed(true);
    };
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const canShow = isMobile && !isStandalone && !dismissed && deferredPrompt != null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_install_dismissed", "1");
    setDismissed(true);
    setDeferredPrompt(null);
  };

  if (!canShow) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4">
      <div className="mx-auto max-w-[520px] rounded-xl border border-[#1a1a1a] bg-[#0f0f0f]/95 backdrop-blur p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-white font-semibold">Installer l&apos;app sur ton téléphone 📱</p>
            <p className="text-xs text-gray-400 mt-1">Ajoute TransformX à ton écran d&apos;accueil pour un accès rapide.</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-lg bg-primary px-3 py-2 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Installer
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-white font-semibold hover:bg-[#111] transition-colors"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

