import { Plugin } from 'obsidian';
import mermaid from 'mermaid';

export default class ModernMermaidPlugin extends Plugin {
	async onload() {
		mermaid.initialize({ startOnLoad: false });
		
		this.registerMarkdownCodeBlockProcessor('mer', async (source, el) => {
			await this.renderMermaid(source, el, 'default', '#ffffff');
		});

		this.registerMarkdownCodeBlockProcessor('merlight', async (source, el) => {
			await this.renderMermaid(source, el, 'default', '#ffffff');
		});

		this.registerMarkdownCodeBlockProcessor('merdark', async (source, el) => {
			await this.renderMermaid(source, el, 'dark', '#000000');
		});
	}

	async renderMermaid(source: string, el: HTMLElement, theme: string, backgroundColor: string) {
		try {
			const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
			mermaid.initialize({ startOnLoad: false, theme: theme });
			const { svg } = await mermaid.render(id, source);
			el.innerHTML = svg;
			el.style.backgroundColor = backgroundColor;
			el.style.padding = '20px';
			el.style.borderRadius = '8px';
			el.style.display = 'flex';
			el.style.justifyContent = 'center';
			el.style.position = 'relative';

			const copyButton = document.createElement('button');
			copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
			copyButton.style.position = 'absolute';
			copyButton.style.top = '8px';
			copyButton.style.left = '8px';
			copyButton.style.padding = '6px';
			copyButton.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
			copyButton.style.color = 'currentColor';
			copyButton.style.border = 'none';
			copyButton.style.borderRadius = '6px';
			copyButton.style.cursor = 'pointer';
			copyButton.style.zIndex = '10';
			copyButton.style.transition = 'all 0.2s ease';
			copyButton.style.opacity = '0.7';

			copyButton.addEventListener('mouseenter', () => {
				copyButton.style.backgroundColor = 'rgba(128, 128, 128, 0.2)';
				copyButton.style.opacity = '1';
			});

			copyButton.addEventListener('mouseleave', () => {
				copyButton.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
				copyButton.style.opacity = '0.7';
			});

			copyButton.addEventListener('click', async () => {
				const originalIcon = copyButton.innerHTML;
				try {
					const svgElement = el.querySelector('svg');
					if (!svgElement) {
						throw new Error('SVG element not found');
					}
					
					svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
					const svgData = new XMLSerializer().serializeToString(svgElement);
					const base64Svg = btoa(unescape(encodeURIComponent(svgData)));
					const url = 'data:image/svg+xml;base64,' + base64Svg;
					
					return new Promise<void>((resolve, reject) => {
						const canvas = document.createElement('canvas');
						const img = new Image();
						
						img.onload = async () => {
							try {
								const bbox = svgElement.getBoundingClientRect();
								canvas.width = Math.ceil((bbox.width || img.width) * 2);
								canvas.height = Math.ceil((bbox.height || img.height) * 2);
								
								const ctx = canvas.getContext('2d');
								if (!ctx) {
									throw new Error('Canvas context is null');
								}
								
								ctx.fillStyle = backgroundColor;
								ctx.fillRect(0, 0, canvas.width, canvas.height);
								ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
								
								canvas.toBlob(async (blob) => {
									if (blob) {
										try {
											await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
											copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
											copyButton.style.color = '#10b981';
											setTimeout(() => {
												copyButton.innerHTML = originalIcon;
												copyButton.style.color = 'currentColor';
											}, 1000);
											resolve();
										} catch (clipboardErr) {
											console.error('Clipboard write failed:', clipboardErr);
											copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
											copyButton.style.color = '#ef4444';
											setTimeout(() => {
												copyButton.innerHTML = originalIcon;
												copyButton.style.color = 'currentColor';
											}, 1500);
											reject(clipboardErr);
										}
									} else {
										throw new Error('Blob creation failed');
									}
								}, 'image/png');
							} catch (drawErr) {
								throw drawErr;
							}
						};
						
						img.onerror = () => {
							copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
							copyButton.style.color = '#ef4444';
							setTimeout(() => {
								copyButton.innerHTML = originalIcon;
								copyButton.style.color = 'currentColor';
							}, 1500);
							reject(new Error('Image load failed'));
						};
						
						img.src = url;
					});
				} catch (err) {
					console.error('Copy failed:', err);
					copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
					copyButton.style.color = '#ef4444';
					setTimeout(() => {
						copyButton.innerHTML = originalIcon;
						copyButton.style.color = 'currentColor';
					}, 1500);
				}
			});

			el.appendChild(copyButton);
		} catch (error) {
			el.textContent = 'Mermaid rendering error: ' + (error as Error).message;
			el.style.color = 'red';
		}
	}

	onunload() {
		
	}
}
