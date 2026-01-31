import { Plugin, Notice, App, PluginSettingTab, Setting } from 'obsidian';

interface MermaidCache {
	version: string;
	code: string;
}

interface ModernMermaidSettings {
	mermaidVersion: string;
}

const DEFAULT_SETTINGS: ModernMermaidSettings = {
	mermaidVersion: 'Not loaded'
}

export default class ModernMermaidPlugin extends Plugin {
	private mermaidLoaded = false;
	private mermaidLoading = false;
	private mermaidLoadPromise: Promise<void> | null = null;
	settings: ModernMermaidSettings = DEFAULT_SETTINGS;

	async onload() {
		console.log('Modern Mermaid plugin loading...');
		
		await this.loadSettings();
		this.addSettingTab(new ModernMermaidSettingTab(this.app, this));
		
		window.addEventListener('unhandledrejection', (event) => {
			if (event.reason && (event.reason as Error).message && (event.reason as Error).message.includes('mermaid')) {
				console.error('Unhandled Mermaid error prevented:', event.reason);
				event.preventDefault();
			}
		});

		try {
			await this.initializeMermaid();
			console.log('Modern Mermaid plugin loaded successfully');
		} catch (error) {
			console.error('Failed to initialize Mermaid:', error);
			new Notice('Mermaid 플러그인 초기화 실패');
			return;
		}
		
		this.registerMarkdownCodeBlockProcessor('mer', async (source, el) => {
			try {
				await this.renderMermaid(source, el, 'default', '#ffffff');
			} catch (error) {
				console.error('Mermaid code block processor error:', error);
			}
		});

		this.registerMarkdownCodeBlockProcessor('merlight', async (source, el) => {
			try {
				await this.renderMermaid(source, el, 'default', '#ffffff');
			} catch (error) {
				console.error('Mermaid code block processor error:', error);
			}
		});

		this.registerMarkdownCodeBlockProcessor('merdark', async (source, el) => {
			try {
				await this.renderMermaid(source, el, 'dark', '#000000');
			} catch (error) {
				console.error('Mermaid code block processor error:', error);
			}
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
		console.log('Loading Mermaid...');
		const cached = this.getCache();

		if (cached) {
			console.log('Using cached Mermaid version:', cached.version);
			try {
				await this.loadMermaidFromCode(cached.code, cached.version);
				console.log('Cached Mermaid loaded successfully');
				
				this.getLatestVersion().then(latestVersion => {
					if (latestVersion !== cached.version) {
						console.log('New version available:', latestVersion, '- will update');
						this.fetchAndLoadLatest(latestVersion).catch(err => {
							console.error('Background update failed:', err);
						});
					}
				}).catch(err => {
					console.error('Failed to check latest version:', err);
				});
				return;
			} catch (error) {
				console.error('Failed to load cached Mermaid:', error);
				this.clearCache();
			}
		}

		console.log('No cache available, fetching latest version');
		try {
			const latestVersion = await this.getLatestVersion();
			await this.fetchAndLoadLatest(latestVersion);
			console.log('Latest Mermaid loaded successfully');
		} catch (error) {
			console.error('Failed to load any Mermaid version:', error);
			throw new Error('Mermaid를 로드할 수 없습니다. 인터넷 연결을 확인하세요.');
		}
	}

	async getLatestVersion(): Promise<string> {
		console.log('Fetching latest Mermaid version...');
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);
		
		try {
			const response = await fetch('https://registry.npmjs.org/mermaid/latest', { 
				signal: controller.signal 
			});
			clearTimeout(timeout);
			const data = await response.json();
			console.log('Latest version:', data.version);
			return data.version;
		} catch (error) {
			clearTimeout(timeout);
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
		console.log(`Fetching Mermaid code for version ${version}...`);
		const url = `https://cdn.jsdelivr.net/npm/mermaid@${version}/dist/mermaid.min.js`;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000);
		
		try {
			const response = await fetch(url, { signal: controller.signal });
			clearTimeout(timeout);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const code = await response.text();
			console.log(`Mermaid code fetched successfully (${code.length} chars)`);
			return code;
		} catch (error) {
			clearTimeout(timeout);
			console.error('Failed to fetch Mermaid code:', error);
			throw error;
		}
	}

	async loadMermaidFromCode(code: string, version: string): Promise<void> {
		console.log(`Loading Mermaid ${version} into DOM...`);
		return new Promise((resolve, reject) => {
			const blob = new Blob([code], { type: 'application/javascript' });
			const url = URL.createObjectURL(blob);
			const script = document.createElement('script');
			script.src = url;
			script.id = 'mermaid-dynamic-script';
			
			const timeout = setTimeout(() => {
				console.warn('Mermaid load timeout, checking if available anyway...');
				URL.revokeObjectURL(url);
				const mermaid = (window as any).mermaid;
				if (mermaid) {
					try {
						mermaid.initialize({ startOnLoad: false });
						resolve();
					} catch (e) {
						reject(new Error('Mermaid initialization failed'));
					}
				} else {
					reject(new Error('Mermaid not loaded after timeout'));
				}
			}, 60000);

			script.onload = () => {
				console.log('Mermaid script loaded, checking for mermaid object...');
				clearTimeout(timeout);
				URL.revokeObjectURL(url);
				const mermaid = (window as any).mermaid;
				if (mermaid) {
					console.log('Mermaid object found, initializing...');
					try {
						mermaid.initialize({ startOnLoad: false });
						console.log('Mermaid initialized successfully');
						this.settings.mermaidVersion = version;
						this.saveSettings();
						resolve();
					} catch (e) {
						console.error('Mermaid initialization failed:', e);
						reject(new Error('Mermaid initialization failed'));
					}
				} else {
					console.error('Mermaid object not found after load');
					reject(new Error('Mermaid not loaded'));
				}
			};

			script.onerror = () => {
				clearTimeout(timeout);
				URL.revokeObjectURL(url);
				console.error('Script error occurred');
				reject(new Error('Failed to load Mermaid from code'));
			};

			console.log('Appending script to head...');
			document.head.appendChild(script);
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
			
			let svg: string;
			try {
				const result = await mermaid.render(id, actualSource);
				svg = result.svg;
			} catch (renderError) {
				console.error('Mermaid render error:', renderError);
				el.innerHTML = `
					<div style="padding: 20px; color: #ef4444; border: 1px solid #ef4444; border-radius: 8px; background-color: rgba(239, 68, 68, 0.1);">
						<strong>Mermaid Rendering Error</strong><br><br>
						${(renderError as Error).message}<br><br>
						<small style="color: #6b7280;">Make sure you're using a valid Mermaid diagram type (e.g., graph, sequence, gantt, class, state, er, pie, journey, gitgraph, mindmap, timeline, sankey, block, architecture, requirement)</small>
					</div>
				`;
				return;
			}
			
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
			console.error('Unexpected Mermaid error:', error);
			el.innerHTML = `
				<div style="padding: 20px; color: #ef4444; border: 1px solid #ef4444; border-radius: 8px; background-color: rgba(239, 68, 68, 0.1);">
					<strong>Mermaid Rendering Error</strong><br><br>
					${(error as Error).message}<br><br>
					<small style="color: #6b7280;">The plugin encountered an unexpected error. Please check the console for details.</small>
				</div>
			`;
		}
	}

	onunload() {
		this.clearCache();
	}
}

class ModernMermaidSettingTab extends PluginSettingTab {
	plugin: ModernMermaidPlugin;

	constructor(app: App, plugin: ModernMermaidPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Modern Mermaid Settings' });

		new Setting(containerEl)
			.setName('Mermaid Version')
			.setDesc('Currently loaded Mermaid library version')
			.addText(text => text
				.setDisabled(true)
				.setValue(this.plugin.settings.mermaidVersion));

		new Setting(containerEl)
			.setName('Clear Cache')
			.setDesc('Clear cached Mermaid library and force re-download')
			.addButton(button => button
				.setButtonText('Clear Cache')
				.onClick(async () => {
					this.plugin.clearCache();
					this.plugin.settings.mermaidVersion = 'Not loaded';
					await this.plugin.saveSettings();
					new Notice('Cache cleared. Please reload Obsidian to re-download Mermaid.');
					this.display();
				}));
	}
}
