import { useState, useEffect } from "react";

/**
 * PWA install prompt banner.
 * Shows when the browser fires the `beforeinstallprompt` event (Chrome/Edge/Android).
 * On iOS it shows manual instructions since iOS doesn't support the event.
 */
function InstallPrompt() {
	const [installEvent, setInstallEvent] = useState(null);
	const [showIOSGuide, setShowIOSGuide] = useState(false);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		// Don't show if already dismissed this session
		if (sessionStorage.getItem("pwa-prompt-dismissed")) return;

		// Chrome / Edge / Android — catch the install event
		const handler = (e) => {
			e.preventDefault();
			setInstallEvent(e);
		};
		window.addEventListener("beforeinstallprompt", handler);

		// iOS Safari — show manual instructions if not already installed
		const isIOS =
			/iphone|ipad|ipod/i.test(navigator.userAgent) &&
			!window.navigator.standalone;
		if (isIOS) setShowIOSGuide(true);

		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);

	const handleInstall = async () => {
		if (!installEvent) return;
		installEvent.prompt();
		const { outcome } = await installEvent.userChoice;
		if (outcome === "accepted") setInstallEvent(null);
	};

	const handleDismiss = () => {
		sessionStorage.setItem("pwa-prompt-dismissed", "1");
		setInstallEvent(null);
		setShowIOSGuide(false);
		setDismissed(true);
	};

	if (dismissed) return null;

	// ── Chrome / Edge / Android banner ────────────────────────────────────────
	if (installEvent) {
		return (
			<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
				<div className="flex items-center gap-3 rounded-xl shadow-lg px-4 py-3 bg-[#281d80] text-white">
					<img
						src="/favicon.svg"
						alt="CYFoverflow"
						className="w-10 h-10 rounded-lg shrink-0"
					/>
					<div className="flex-1 min-w-0">
						<p className="font-semibold text-sm">Install CYFoverflow</p>
						<p className="text-xs text-indigo-200">
							Add to your home screen for quick access
						</p>
					</div>
					<div className="flex gap-2 shrink-0">
						<button
							onClick={handleDismiss}
							className="text-indigo-300 hover:text-white text-xs px-2 py-1 rounded"
						>
							Not now
						</button>
						<button
							onClick={handleInstall}
							className="bg-white text-[#281d80] text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
						>
							Install
						</button>
					</div>
				</div>
			</div>
		);
	}

	// ── iOS manual instructions ───────────────────────────────────────────────
	if (showIOSGuide) {
		return (
			<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
				<div className="rounded-xl shadow-lg px-4 py-3 bg-[#281d80] text-white">
					<div className="flex items-start justify-between gap-2 mb-2">
						<div className="flex items-center gap-2">
							<img
								src="/favicon.svg"
								alt="CYFoverflow"
								className="w-8 h-8 rounded-lg"
							/>
							<p className="font-semibold text-sm">Install CYFoverflow</p>
						</div>
						<button
							onClick={handleDismiss}
							className="text-indigo-300 hover:text-white text-lg leading-none"
						>
							×
						</button>
					</div>
					<p className="text-xs text-indigo-200 leading-relaxed">
						Tap the <span className="font-bold text-white">Share</span> button
						below, then select{" "}
						<span className="font-bold text-white">
							&ldquo;Add to Home Screen&rdquo;
						</span>
					</p>
					{/* iOS share arrow indicator */}
					<div className="mt-2 flex justify-center">
						<svg
							className="w-5 h-5 text-indigo-300"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 10l7-7m0 0l7 7m-7-7v18"
							/>
						</svg>
					</div>
				</div>
			</div>
		);
	}

	return null;
}

export default InstallPrompt;
