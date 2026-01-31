export interface MermaidCache {
	version: string;
	code: string;
}

export interface ModernMermaidSettings {
	mermaidVersion: string;
	transparentMerBackground: boolean;
	includeBackgroundInCopy: boolean;
	enablePanZoom: boolean;
	doubleClickZoomLevel: number;
}

export const DEFAULT_SETTINGS: ModernMermaidSettings = {
	mermaidVersion: 'Not loaded',
	transparentMerBackground: true,
	includeBackgroundInCopy: true,
	enablePanZoom: true,
	doubleClickZoomLevel: 2
};
