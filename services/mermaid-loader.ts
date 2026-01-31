import { Plugin } from 'obsidian';
import { MermaidCache } from '../types';
import { SettingsManager } from './settings-manager';

export class MermaidLoader {
	private mermaidLoaded = false;
	private mermaidLoading = false;
	private mermaidLoadPromise: Promise<void> | null = null;
	private pluginMermaidInstance: any = null;
	private settingsManager: SettingsManager;

	constructor(private plugin: Plugin) {
		this.settingsManager = new SettingsManager(plugin);
	}

	async initializeMermaid(): Promise<void> {
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

	async loadMermaid(): Promise<void> {
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
			const data = await response.json();
			console.log('Latest version:', data.version);
			return data.version;
		} catch (error) {
			console.error('Failed to fetch latest version:', error);
			throw error;
		} finally {
			clearTimeout(timeout);
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

	saveCache(version: string, code: string): void {
		try {
			localStorage.setItem('modern-mermaid-cached-version', version);
			localStorage.setItem('modern-mermaid-cached-code', code);
		} catch (error) {
			console.error('Failed to save cache:', error);
		}
	}

	clearCache(): void {
		try {
			localStorage.removeItem('modern-mermaid-cached-version');
			localStorage.removeItem('modern-mermaid-cached-code');
		} catch (error) {
			console.error('Failed to clear cache:', error);
		}
	}

	async fetchAndLoadLatest(version: string): Promise<void> {
		try {
			const code = await this.fetchMermaidCode(version);
			await this.loadMermaidFromCode(code, version);
			this.saveCache(version, code);
			const { Notice } = await import('obsidian');
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
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const code = await response.text();
			console.log(`Mermaid code fetched successfully (${code.length} chars)`);
			return code;
		} catch (error) {
			console.error('Failed to fetch Mermaid code:', error);
			throw error;
		} finally {
			clearTimeout(timeout);
		}
	}

	async loadMermaidFromCode(code: string, version: string): Promise<void> {
		console.log(`Loading Mermaid ${version} into DOM...`);
		this.cleanupExistingScript();
		
		return new Promise((resolve, reject) => {
			const blob = new Blob([code], { type: 'application/javascript' });
			const url = URL.createObjectURL(blob);
			const script = document.createElement('script');
			script.src = url;
			script.id = 'mermaid-dynamic-script';
			
			const timeout = setTimeout(() => {
				console.warn('Mermaid load timeout, checking if available anyway...');
				URL.revokeObjectURL(url);
				if (this.pluginMermaidInstance) {
					try {
						this.pluginMermaidInstance.initialize({ startOnLoad: false });
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
					this.pluginMermaidInstance = mermaid;
					try {
						mermaid.initialize({ startOnLoad: false });
						console.log('Mermaid initialized successfully');
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

	private cleanupExistingScript(): void {
		const existingScript = document.getElementById('mermaid-dynamic-script');
		if (existingScript) {
			existingScript.remove();
		}
		
		delete (window as any).mermaid;
		this.pluginMermaidInstance = null;
	}

	cleanup(): void {
		this.cleanupExistingScript();
	}

	getMermaidInstance(): any {
		return this.pluginMermaidInstance;
	}

	async updateVersion(version: string): Promise<void> {
		if (this.pluginMermaidInstance) {
			this.settingsManager.updateSettings({ mermaidVersion: version });
			await this.settingsManager.saveSettings();
		}
	}
}
