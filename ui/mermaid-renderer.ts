import { ModernMermaidSettings } from '../types';
import { PanZoomHandler } from './pan-zoom-handler';
import { createControlButton, CleanupFunction } from './controls/button-helper';

const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const SUCCESS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ERROR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const LOCK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
const UNLOCK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;

export class MermaidRenderer {
 	private static panZoomHandlers = new WeakMap<HTMLElement, PanZoomHandler>();
 	private static activeHandlers = new Set<PanZoomHandler>();
 	private timeoutIds = new Set<number>();
 	private zoomControlsCleanup: CleanupFunction | null = null;
 	private locked: boolean = true;
 	private lockButton: HTMLButtonElement | null = null;
 	private currentWrapper: HTMLElement | null = null;
	constructor(
		private mermaid: any,
		private settings: ModernMermaidSettings
	) {}

	static cleanupAllHandlers(): void {
		for (const handler of MermaidRenderer.activeHandlers) {
			handler.destroy();
		}
		MermaidRenderer.activeHandlers.clear();
	}

	async render(source: string, el: HTMLElement, theme: string, backgroundColor: string): Promise<void> {
		const { width, source: actualSource } = this.parseWidth(source);
		const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
		const themeConfig = theme === 'dark' ? 'dark' : 'default';

		this.mermaid.initialize({ startOnLoad: false, theme: themeConfig });

		let svg: string;
		try {
			const result = await this.mermaid.render(id, actualSource);
			svg = result.svg;
		} catch (renderError) {
			console.error('Mermaid render error:', renderError);
			this.renderMermaidError(el, (renderError as Error).message);
			return;
		}

		if (this.settings.enablePanZoom) {
			this.renderWithPanZoom(svg, el);
		} else {
			this.renderWithoutPanZoom(svg, el);
		}

		this.applyStyles(el, backgroundColor, width);
		this.addCopyButton(el, backgroundColor);
	}

	private renderWithPanZoom(svg: string, el: HTMLElement): void {
 		if (this.zoomControlsCleanup) {
 			this.zoomControlsCleanup();
 		}

 		const wrapper = document.createElement('div');
 		wrapper.innerHTML = svg;
 		wrapper.style.cursor = this.locked ? 'default' : 'grab';
 		wrapper.style.userSelect = this.locked ? 'text' : 'none';
 		wrapper.style.display = 'inline-block';
 		wrapper.style.textAlign = 'center';

 		el.innerHTML = '';
 		el.appendChild(wrapper);

 		this.currentWrapper = wrapper;

 		const svgElement = wrapper.querySelector('svg');
 		if (svgElement) {
 			svgElement.style.transition = 'transform 0.1s ease-out';
 			svgElement.style.display = 'block';
 			svgElement.style.margin = '0 auto';
 			const svgWidth = svgElement.getAttribute('width');
 			const svgHeight = svgElement.getAttribute('height');
 			if (svgWidth) {
 				wrapper.style.width = svgWidth;
 			}
 			if (svgHeight) {
 				wrapper.style.height = svgHeight;
 			}
 		}

 		const existingHandler = MermaidRenderer.panZoomHandlers.get(wrapper);
 		if (existingHandler) {
 			existingHandler.destroy();
 			MermaidRenderer.activeHandlers.delete(existingHandler);
 		}

 		this.locked = this.settings.panZoomLocked;
 		const panZoomHandler = new PanZoomHandler(wrapper, svgElement, this.settings, this.locked, this.settings.enableTouchpadPan);
 		panZoomHandler.setup();
 		MermaidRenderer.panZoomHandlers.set(wrapper, panZoomHandler);
 		MermaidRenderer.activeHandlers.add(panZoomHandler);

 		this.addZoomControls(panZoomHandler, el);
 		this.addLockButton(panZoomHandler, el);
 	}

	private renderWithoutPanZoom(svg: string, el: HTMLElement): void {
		el.innerHTML = svg;

		const svgElement = el.querySelector('svg');
		if (svgElement) {
			svgElement.style.display = 'block';
			svgElement.style.margin = '0 auto';
		}
	}

	private addZoomControls(panZoomHandler: PanZoomHandler, el: HTMLElement): void {
		const controlsDiv = document.createElement('div');
		controlsDiv.style.position = 'absolute';
		controlsDiv.style.bottom = '8px';
		controlsDiv.style.right = '8px';
		controlsDiv.style.display = 'flex';
		controlsDiv.style.gap = '4px';
		controlsDiv.style.zIndex = '10';

		const cleanups: Array<CleanupFunction> = [];

		const { button: btn1, cleanup: cleanup1 } = createControlButton(controlsDiv, {
			icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="m8 11 2 2"/><path d="m11 8 2 2"/><path d="m14 11 2 2"/><path d="m11 14 2 2"/><path d="m8 11-2-2"/><path d="m11 8-2-2"/><path d="m14 11-2-2"/><path d="m11 14-2-2"/></svg>`,
			onClick: () => panZoomHandler.zoomOut()
		});
		cleanups.push(cleanup1);

		const { button: btn2, cleanup: cleanup2 } = createControlButton(controlsDiv, {
			icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="m9 9 3 3"/><path d="m9 12 3 3"/><path d="m12 9 3 3"/><path d="m12 12 3 3"/></svg>`,
			onClick: () => panZoomHandler.zoomIn()
		});
		cleanups.push(cleanup2);

		const { button: btn3, cleanup: cleanup3 } = createControlButton(controlsDiv, {
			icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 17h6"/><path d="M12 21h6"/><path d="M12 7h6"/></svg>`,
			onClick: () => panZoomHandler.reset()
		});
		cleanups.push(cleanup3);

		el.appendChild(controlsDiv);

		this.zoomControlsCleanup = () => {
			cleanups.forEach(cleanup => cleanup());
			controlsDiv.remove();
		};
	}

	private applyStyles(el: HTMLElement, backgroundColor: string, width: number | null): void {
		if (backgroundColor !== 'transparent') {
			el.style.backgroundColor = backgroundColor;
		}
		el.style.padding = '20px';
		el.style.borderRadius = '8px';
		el.style.display = 'flex';
		el.style.justifyContent = 'center';
		el.style.position = 'relative';

		if (width) {
			el.style.width = `${width}px`;
			el.style.overflowX = 'auto';
		}
	}

	private parseWidth(source: string): { width: number | null; source: string } {
		const lines = source.split('\n');
		const firstLine = lines[0].trim();
		const widthMatch = firstLine.match(/^(\d+)$/);

		if (widthMatch) {
			const width = parseInt(widthMatch[1], 10);
			return { width, source: lines.slice(1).join('\n').trimStart() };
		}

		return { width: null, source };
	}

	private renderMermaidError(el: HTMLElement, errorMessage: string): void {
		el.innerHTML = `
			<div style="padding: 20px; color: #ef4444; border: 1px solid #ef4444; border-radius: 8px; background-color: rgba(239, 68, 68, 0.1);">
				<strong>Mermaid Rendering Error</strong><br><br>
				${errorMessage}<br><br>
				<small style="color: #6b7280;">Make sure you're using a valid Mermaid diagram type (e.g., graph, sequence, gantt, class, state, er, pie, journey, gitgraph, mindmap, timeline, sankey, block, architecture, requirement)</small>
			</div>
		`;
	}

	private extractSvgFromElement(el: HTMLElement): SVGSVGElement | null {
		const svgElement = el.querySelector('svg') as SVGSVGElement;
		if (!svgElement) {
			return null;
		}
		svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		return svgElement;
	}

	private convertSvgToDataUrl(svgElement: SVGSVGElement): string {
		const svgData = new XMLSerializer().serializeToString(svgElement);
		const base64Svg = btoa(unescape(encodeURIComponent(svgData)));
		return 'data:image/svg+xml;base64,' + base64Svg;
	}

	private renderSvgToCanvas(url: string, svgElement: SVGSVGElement, backgroundColor: string): Promise<Blob> {
		return new Promise((resolve, reject) => {
			const canvas = document.createElement('canvas');
			const img = new Image();

			const cleanup = () => {
				img.onload = null;
				img.onerror = null;
				img.src = '';
			};

			img.onload = () => {
				try {
					const bbox = svgElement.getBoundingClientRect();
					canvas.width = Math.ceil((bbox.width || img.width) * 2);
					canvas.height = Math.ceil((bbox.height || img.height) * 2);

					const ctx = canvas.getContext('2d');
					if (!ctx) {
						cleanup();
						throw new Error('Canvas context is null');
					}

					if (this.settings.includeBackgroundInCopy && backgroundColor !== 'transparent') {
						ctx.fillStyle = backgroundColor;
						ctx.fillRect(0, 0, canvas.width, canvas.height);
					}
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

					canvas.toBlob((blob) => {
						cleanup();
						if (blob) {
							resolve(blob);
						} else {
							reject(new Error('Blob creation failed'));
						}
					}, 'image/png');
				} catch (drawErr) {
					cleanup();
					reject(drawErr);
				}
			};

			img.onerror = () => {
				cleanup();
				reject(new Error('Image load failed'));
			};

			img.src = url;
		});
	}

	private async writeBlobToClipboard(blob: Blob): Promise<void> {
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
	}

	private async copySvgToClipboard(el: HTMLElement, backgroundColor: string): Promise<void> {
		const svgElement = this.extractSvgFromElement(el);
		if (!svgElement) {
			throw new Error('SVG element not found');
		}

		const url = this.convertSvgToDataUrl(svgElement);
		const blob = await this.renderSvgToCanvas(url, svgElement, backgroundColor);
		await this.writeBlobToClipboard(blob);
	}

	private showCopyFeedback(button: HTMLButtonElement, icon: string, color: string, timeout: number): void {
		button.innerHTML = icon;
		button.style.color = color;
		const timeoutId = window.setTimeout(() => {
			button.innerHTML = COPY_ICON;
			button.style.color = 'currentColor';
			this.timeoutIds.delete(timeoutId);
		}, timeout);
		this.timeoutIds.add(timeoutId);
	}

	private async handleCopyClick(el: HTMLElement, button: HTMLButtonElement, backgroundColor: string): Promise<void> {
		const originalIcon = button.innerHTML;

		try {
			await this.copySvgToClipboard(el, backgroundColor);
			this.showCopyFeedback(button, SUCCESS_ICON, '#10b981', 1000);
		} catch (err) {
			console.error('Copy failed:', err);
			this.showCopyFeedback(button, ERROR_ICON, '#ef4444', 1500);
		}
	}

	private createCopyButtonElement(): HTMLButtonElement {
		const button = document.createElement('button');
		button.innerHTML = COPY_ICON;
		button.style.position = 'absolute';
		button.style.top = '8px';
		button.style.left = '8px';
		button.style.padding = '6px';
		button.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
		button.style.color = 'currentColor';
		button.style.border = 'none';
		button.style.borderRadius = '6px';
		button.style.cursor = 'pointer';
		button.style.zIndex = '10';
		button.style.transition = 'all 0.2s ease';
		button.style.opacity = '0.7';
		return button;
	}

	private setupCopyButtonEvents(button: HTMLButtonElement, el: HTMLElement, backgroundColor: string): void {
		const mouseEnterHandler = () => {
			button.style.backgroundColor = 'rgba(128, 128, 128, 0.2)';
			button.style.opacity = '1';
		};

		const mouseLeaveHandler = () => {
			button.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
			button.style.opacity = '0.7';
		};

		const clickHandler = async () => {
			if (!document.contains(button)) {
				return;
			}
			await this.handleCopyClick(el, button, backgroundColor);
		};

		button.addEventListener('mouseenter', mouseEnterHandler);
		button.addEventListener('mouseleave', mouseLeaveHandler);
		button.addEventListener('click', clickHandler);
	}

	private addCopyButton(el: HTMLElement, backgroundColor: string): void {
 		const button = this.createCopyButtonElement();
 		this.setupCopyButtonEvents(button, el, backgroundColor);
 		el.appendChild(button);
 	}

 	private addLockButton(panZoomHandler: PanZoomHandler, el: HTMLElement): void {
 		const button = this.createLockButtonElement();
 		this.setupLockButtonEvents(button, panZoomHandler);
 		el.appendChild(button);
 	}

 	private createLockButtonElement(): HTMLButtonElement {
 		const button = document.createElement('button');
 		button.innerHTML = this.locked ? LOCK_ICON : UNLOCK_ICON;
 		button.style.position = 'absolute';
 		button.style.top = '8px';
 		button.style.right = '8px';
 		button.style.padding = '6px';
 		button.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
 		button.style.color = this.locked ? 'currentColor' : '#3b82f6';
 		button.style.border = 'none';
 		button.style.borderRadius = '6px';
 		button.style.cursor = 'pointer';
 		button.style.zIndex = '10';
 		button.style.transition = 'all 0.2s ease';
 		button.style.opacity = this.locked ? '0.7' : '1';
 		button.title = this.locked ? 'Pan & zoom locked (click to unlock)' : 'Pan & zoom unlocked (click to lock)';
 		return button;
 	}

 	private setupLockButtonEvents(button: HTMLButtonElement, panZoomHandler: PanZoomHandler): void {
 		const mouseEnterHandler = () => {
 			button.style.backgroundColor = 'rgba(128, 128, 128, 0.2)';
 			button.style.opacity = '1';
 		};

 		const mouseLeaveHandler = () => {
 			button.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
 			button.style.opacity = this.locked ? '0.7' : '1';
 		};

 		const clickHandler = () => {
 			this.locked = !this.locked;
 			button.innerHTML = this.locked ? LOCK_ICON : UNLOCK_ICON;
 			button.style.color = this.locked ? 'currentColor' : '#3b82f6';
 			button.style.opacity = this.locked ? '0.7' : '1';
 			button.title = this.locked ? 'Pan & zoom locked (click to unlock)' : 'Pan & zoom unlocked (click to lock)';

 			if (this.currentWrapper) {
 				panZoomHandler.setLocked(this.locked);
 				this.currentWrapper.style.cursor = this.locked ? 'default' : 'grab';
 				this.currentWrapper.style.userSelect = this.locked ? 'text' : 'none';
 			}
 		};

 		button.addEventListener('mouseenter', mouseEnterHandler);
 		button.addEventListener('mouseleave', mouseLeaveHandler);
 		button.addEventListener('click', clickHandler);

 		this.lockButton = button;
 	}

	cleanup(): void {
 		for (const timeoutId of this.timeoutIds) {
 			clearTimeout(timeoutId);
 		}
 		this.timeoutIds.clear();

 		if (this.zoomControlsCleanup) {
 			this.zoomControlsCleanup();
 			this.zoomControlsCleanup = null;
 		}

 		if (this.lockButton) {
 			this.lockButton.remove();
 			this.lockButton = null;
 		}
 	}
}
