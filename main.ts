import { Plugin, Notice } from 'obsidian';

interface MermaidCache {
	version: string;
	code: string;
}

export default class ModernMermaidPlugin extends Plugin {
	private mermaidLoaded = false;
	private mermaidLoading = false;
	private mermaidLoadPromise: Promise<void> | null = null;

	async onload() {
		await this.initializeMermaid();
		
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

	async initializeMermaid() {
		if (this.mermaidLoaded) {
			return;
		}

		if (this.mermaidLoading) {
			if (this.mermaidLoadPromise) {
				await this.mermaidLoadPromise;
			}
			return;
		}

		this.mermaidLoading = true;
		this.mermaidLoadPromise = this.loadMermaid();

		try {
			await this.mermaidLoadPromise;
			this.mermaidLoaded = true;
		} finally {
			this.mermaidLoading = false;
			this.mermaidLoadPromise = null;
		}
	}

	async loadMermaid() {
		const latestVersion = await this.getLatestVersion();
		const cached = this.getCache();

		if (cached && cached.version === latestVersion) {
			await this.loadMermaidFromCode(cached.code, latestVersion);
			return;
		}

		if (cached && cached.version !== latestVersion) {
			try {
				await this.fetchAndLoadLatest(latestVersion);
			} catch (error) {
				console.error('Failed to load latest version, using cache:', error);
				await this.loadMermaidFromCode(cached.code, cached.version);
				new Notice(`Mermaid 업데이트 실패, 버전 ${cached.version} 사용`);
			}
			return;
		}

		await this.fetchAndLoadLatest(latestVersion);
	}

	async getLatestVersion(): Promise<string> {
		try {
			const response = await fetch('https://registry.npmjs.org/mermaid/latest');
			const data = await response.json();
			return data.version;
		} catch (error) {
			console.error('Failed to fetch latest version:', error);
			throw error;
		}
	}

	getCache(): MermaidCache | null {
		try {
			const version = localStorage.getItem('modern-mermaid-cached-version');
			const code = localStorage.getItem('modern-mermaid-cached-code');
			
			if (version && code) {
				return { version, code };
			}
			
			return null;
		} catch (error) {
			console.error('Failed to load cache:', error);
			return null;
		}
	}

	saveCache(version: string, code: string) {
		try {
			localStorage.setItem('modern-mermaid-cached-version', version);
			localStorage.setItem('modern-mermaid-cached-code', code);
		} catch (error) {
			console.error('Failed to save cache:', error);
		}
	}

	clearCache() {
		try {
			localStorage.removeItem('modern-mermaid-cached-version');
			localStorage.removeItem('modern-mermaid-cached-code');
		} catch (error) {
			console.error('Failed to clear cache:', error);
		}
	}

	async fetchAndLoadLatest(version: string) {
		try {
			const code = await this.fetchMermaidCode(version);
			await this.loadMermaidFromCode(code, version);
			this.saveCache(version, code);
			new Notice(`Mermaid v${version} 업데이트 완료`);
		} catch (error) {
			console.error('Failed to fetch and load latest Mermaid:', error);
			throw error;
		}
	}

	async fetchMermaidCode(version: string): Promise<string> {
		const url = `https://cdn.jsdelivr.net/npm/mermaid@${version}/dist/mermaid.min.js`;
		
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return await response.text();
		} catch (error) {
			console.error('Failed to fetch Mermaid code:', error);
			throw error;
		}
	}

	async loadMermaidFromCode(code: string, version: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.textContent = code;
			script.onload = () => {
				const mermaid = (window as any).mermaid;
				if (mermaid) {
					mermaid.initialize({ startOnLoad: false });
					resolve();
				} else {
					reject(new Error('Mermaid not loaded'));
				}
			};
			script.onerror = () => {
				reject(new Error('Failed to load Mermaid from code'));
			};
			document.head.appendChild(script);
		});
	}

	parseWidth(source: string): { width: number | null; source: string } {
		const lines = source.split('\n');
		const firstLine = lines[0].trim();
		const widthMatch = firstLine.match(/^(\d+)$/);
		
		if (widthMatch) {
			const width = parseInt(widthMatch[1], 10);
			return { width, source: lines.slice(1).join('\n').trimStart() };
		}
		
		return { width: null, source };
	}

	async renderMermaid(source: string, el: HTMLElement, theme: string, backgroundColor: string) {
		await this.initializeMermaid();
		
		try {
			const { width, source: actualSource } = this.parseWidth(source);
			const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
			const themeConfig = theme === 'dark' ? 'dark' : 'default';
			
			const mermaid = (window as any).mermaid;
			if (!mermaid) {
				throw new Error('Mermaid not available');
			}
			
			mermaid.initialize({ startOnLoad: false, theme: themeConfig });
			const { svg } = await mermaid.render(id, actualSource);
			el.innerHTML = svg;
			el.style.backgroundColor = backgroundColor;
			el.style.padding = '20px';
			el.style.borderRadius = '8px';
			el.style.display = 'flex';
			el.style.justifyContent = 'center';
			el.style.position = 'relative';
			
			if (width) {
				el.style.width = `${width}px`;
				el.style.overflowX = 'auto';
			}

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
		this.clearCache();
	}
}
