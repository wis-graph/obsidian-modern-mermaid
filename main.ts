import { Plugin, Notice, App, PluginSettingTab, Setting } from 'obsidian';
import { MermaidLoader } from './services/mermaid-loader';
import { SettingsManager } from './services/settings-manager';
import { MermaidRenderer } from './ui/mermaid-renderer';
import { MermaidCache, ModernMermaidSettings, DEFAULT_SETTINGS } from './types';

export default class ModernMermaidPlugin extends Plugin {
	private mermaidLoader: MermaidLoader;
	private settingsManager: SettingsManager;
	private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
	settings: ModernMermaidSettings = DEFAULT_SETTINGS;

	async onload() {
		console.log('Modern Mermaid plugin loading...');
		
		this.settingsManager = new SettingsManager(this);
		this.mermaidLoader = new MermaidLoader(this);
		
		await this.settingsManager.loadSettings();
		this.settings = this.settingsManager.getSettings();
		this.addSettingTab(new ModernMermaidSettingTab(this.app, this));
		
		this.unhandledRejectionHandler = (event) => {
			if (event.reason && (event.reason as Error).message && (event.reason as Error).message.includes('mermaid')) {
				console.error('Unhandled Mermaid error prevented:', event.reason);
				event.preventDefault();
			}
		};
		window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);

		try {
			await this.mermaidLoader.initializeMermaid();
			console.log('Modern Mermaid plugin loaded successfully');
		} catch (error) {
			console.error('Failed to initialize Mermaid:', error);
			new Notice('Mermaid 플러그인 초기화 실패');
			return;
		}
		
		this.registerMarkdownCodeBlockProcessor('mer', async (source, el) => {
			try {
				const backgroundColor = this.settings.transparentMerBackground ? 'transparent' : '#ffffff';
				await this.renderMermaid(source, el, 'default', backgroundColor);
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

	async renderMermaid(source: string, el: HTMLElement, theme: string, backgroundColor: string) {
		await this.mermaidLoader.initializeMermaid();

		const mermaid = this.mermaidLoader.getMermaidInstance();
		if (!mermaid) {
			throw new Error('Mermaid not available');
		}

		const renderer = new MermaidRenderer(mermaid, this.settings);
		await renderer.render(source, el, theme, backgroundColor);
	}

	clearCache(): void {
		this.mermaidLoader.clearCache();
	}

	async saveSettings(): Promise<void> {
		this.settingsManager.updateSettings(this.settings);
		await this.settingsManager.saveSettings();
	}

	onunload() {
		if (this.unhandledRejectionHandler) {
			window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
			this.unhandledRejectionHandler = null;
		}
		MermaidRenderer.cleanupAllHandlers();
		this.mermaidLoader.cleanup();
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
			.setName('Enable Pan & Zoom')
			.setDesc('Enable mouse wheel zoom and drag-to-pan for diagrams.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enablePanZoom)
				.onChange(async (value) => {
					this.plugin.settings.enablePanZoom = value;
					await this.plugin.saveSettings();
				}));

new Setting(containerEl)
 			.setName('Double Click Zoom Level')
 			.setDesc('Zoom level when double-clicking on diagram (1 = original size, 2 = 2x, 3 = 3x). Click again to reset.')
 			.addSlider(slider => slider
 				.setLimits(1.5, 5, 0.5)
 				.setValue(this.plugin.settings.doubleClickZoomLevel)
 				.setDynamicTooltip()
 				.onChange(async (value) => {
 					this.plugin.settings.doubleClickZoomLevel = value;
 					await this.plugin.saveSettings();
 				}));

 		new Setting(containerEl)
 			.setName('Pan & Zoom Locked by Default')
 			.setDesc('Pan & zoom is locked by default. Click the lock button on the diagram to enable it. When locked, mouse wheel scrolls the document normally.')
 			.addToggle(toggle => toggle
 				.setValue(this.plugin.settings.panZoomLocked)
 				.onChange(async (value) => {
 					this.plugin.settings.panZoomLocked = value;
 					await this.plugin.saveSettings();
 				}));

 		new Setting(containerEl)
 			.setName('Enable Touchpad Pan')
 			.setDesc('Enable two-finger horizontal/diagonal scrolling on touchpads for panning (when unlocked). Vertical scrolling uses Ctrl/Cmd + wheel for zoom.')
 			.addToggle(toggle => toggle
 				.setValue(this.plugin.settings.enableTouchpadPan)
 				.onChange(async (value) => {
 					this.plugin.settings.enableTouchpadPan = value;
 					await this.plugin.saveSettings();
 				}));

		new Setting(containerEl)
			.setName('Transparent Background for "mer"')
			.setDesc('Use transparent background for "mer" code blocks. Disable to use white background.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.transparentMerBackground)
				.onChange(async (value) => {
					this.plugin.settings.transparentMerBackground = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Include Background in Copy')
			.setDesc('Include background color when copying as image. Disable to copy only diagram.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeBackgroundInCopy)
				.onChange(async (value) => {
					this.plugin.settings.includeBackgroundInCopy = value;
					await this.plugin.saveSettings();
				}));

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
