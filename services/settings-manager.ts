import { Plugin } from 'obsidian';
import { ModernMermaidSettings, DEFAULT_SETTINGS } from '../types';

export class SettingsManager {
	private settings: ModernMermaidSettings = DEFAULT_SETTINGS;

	constructor(private plugin: Plugin) {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.plugin.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.plugin.saveData(this.settings);
	}

	getSettings(): ModernMermaidSettings {
		return this.settings;
	}

	updateSettings(settings: Partial<ModernMermaidSettings>): void {
		this.settings = { ...this.settings, ...settings };
	}
}
