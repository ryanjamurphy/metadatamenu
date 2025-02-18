import { FileView, MarkdownView, Plugin, TFile } from 'obsidian';
import Field from 'src/fields/Field';
import FileClassAttributeSelectModal from 'src/fileClass/FileClassAttributeSelectModal';
import FileClassQuery from 'src/fileClass/FileClassQuery';
import type { IMetadataMenuApi } from 'src/MetadataMenuApi';
import { MetadataMenuApi } from 'src/MetadataMenuApi';
import FieldCommandSuggestModal from 'src/optionModals/FieldCommandSuggestModal';
import linkContextMenu from "src/options/linkContextMenu";
import OptionsList from 'src/options/OptionsList';
import { DEFAULT_SETTINGS, MetadataMenuSettings } from "src/settings/MetadataMenuSettings";
import MetadataMenuSettingTab from "src/settings/MetadataMenuSettingTab";
import { migrateSettingsV1toV2 } from 'src/settings/migrateSettingV1toV2';
import ValueSuggest from "src/suggester/metadataSuggester";

export default class MetadataMenu extends Plugin {
	public api: IMetadataMenuApi;
	public settings: MetadataMenuSettings;
	public initialProperties: Array<Field> = [];
	public initialFileClassQueries: Array<FileClassQuery> = [];
	public settingTab: MetadataMenuSettingTab;

	async onload(): Promise<void> {
		console.log('Metadata Menu loaded');
		await this.loadSettings();
		if (this.settings.settingsVersion === undefined) {
			await migrateSettingsV1toV2(this)
		}

		this.settings.presetFields.forEach(prop => {
			const property = new Field();
			Object.assign(property, prop);
			this.initialProperties.push(property);
		});

		this.settings.fileClassQueries.forEach(query => {
			const fileClassQuery = new FileClassQuery();
			Object.assign(fileClassQuery, query);
			this.initialFileClassQueries.push(fileClassQuery);
		})

		this.addSettingTab(new MetadataMenuSettingTab(this.app, this));

		this.registerEditorSuggest(new ValueSuggest(this.app, this));
		this.api = new MetadataMenuApi(this).make();

		this.addFieldCommand();

		this.addInsertFieldAtPositionCommand();

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				const view = leaf?.view
				if (view && view instanceof FileView) {
					const file = app.vault.getAbstractFileByPath(view.file.path)
					if (file instanceof TFile && file.extension === 'md') {
						if (file.parent.path + "/" !== this.settings.classFilesPath) {
							this.addInsertFieldAtPositionCommand()
						}
						this.addFieldCommand();
					}
				}
			})
		)

		this.addCommand({
			id: "fileClassAttr_options",
			name: "fileClass attributes options",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (checking) {
					return !!(view?.file) && `${view.file.parent.path}/` == this.settings.classFilesPath
				}
				const modal = new FileClassAttributeSelectModal(this, view!.file)
				modal.open()
			},
		});

		new linkContextMenu(this);
	};

	onunload() {
		console.log('Metadata Menu unloaded');
	};

	private addInsertFieldAtPositionCommand() {
		this.addCommand({
			id: "insert_field_at_cursor",
			name: "insert field at cursor",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (checking) {
					return !!(view?.file)
				}
				const optionsList = new OptionsList(this, view!.file, "InsertFieldCommand");
				optionsList.createExtraOptionList();
			}
		})
	}

	private addFieldCommand() {
		this.addCommand({
			id: "field_options",
			name: "field options",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (checking) {
					return !!(view?.file)
				}
				const fieldCommandSuggestModal = new FieldCommandSuggestModal(this.app)
				const optionsList = new OptionsList(this, view!.file, fieldCommandSuggestModal);
				optionsList.createExtraOptionList();
			},
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	};

	async saveSettings() {
		this.settings.presetFields = this.initialProperties;
		this.settings.fileClassQueries = this.initialFileClassQueries;
		await this.saveData(this.settings);
	};
}
