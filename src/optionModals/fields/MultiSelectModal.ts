import { App, Modal, ToggleComponent, TFile, ButtonComponent, ExtraButtonComponent } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import FieldSetting from "src/settings/FieldSetting";
import { insertValues } from "src/commands/insertValues";

export default class MultiSelectModal extends Modal {

    private file: TFile;
    private field: Field;
    private options: Array<string>;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private after: boolean;

    constructor(app: App, file: TFile, field: Field, initialOptions: string, lineNumber: number = -1, inFrontMatter: boolean = false, after: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.field = field;
        if (initialOptions) {
            if (initialOptions.toString().startsWith("[[")) {
                this.options = initialOptions.split(",").map(item => item.trim());
            } else {
                this.options = initialOptions.toString().replace(/^\[(.*)\]$/, "$1").split(",").map(item => item.trim());
            };
        } else {
            this.options = [];
        };
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.after = after;
    };

    async onOpen() {
        this.containerEl.addClass("metadata-menu");

        const valueGrid = this.contentEl.createDiv({
            cls: "metadata-menu-value-grid"
        });
        const listNoteValues = await FieldSetting.getValuesListFromNote(this.field.valuesListNotePath, this.app)
        await this.populateValuesGrid(valueGrid, listNoteValues);
    };

    private async populateValuesGrid(valueGrid: HTMLDivElement, listNoteValues: string[]): Promise<void> {
        if (listNoteValues.length === 0) {
            Object.keys(this.field.options).forEach(key => {
                const presetValue = this.field.options[key];
                this.buildValueToggler(valueGrid, presetValue);
            })
        };
        listNoteValues.forEach(value => {
            this.buildValueToggler(valueGrid, value);
        });
        const footer = this.contentEl.createDiv({ cls: "metadata-menu-value-grid-footer" });
        const saveButton = new ButtonComponent(footer);
        saveButton.setIcon("checkmark");
        saveButton.onClick(async () => {
            if (this.lineNumber == -1) {
                replaceValues(this.app, this.file, this.field.name, this.options.join(","));
            } else {
                const renderedValues = !this.inFrontmatter ? this.options.join(",") : this.options.length > 1 ? `[${this.options.join(", ")}]` : this.options[0]
                insertValues(this.app, this.file, this.field.name, renderedValues, this.lineNumber, this.inFrontmatter, this.after);
            };
            this.close();
        });
        const cancelButton = new ExtraButtonComponent(footer);
        cancelButton.setIcon("cross");
        cancelButton.onClick(() => this.close());
        this.contentEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                saveButton.buttonEl.focus();
            }
        })
    };

    private buildValueToggler(valueGrid: HTMLDivElement, presetOption: string) {
        const valueSelectorContainer = valueGrid.createDiv({
            cls: "metadata-menu-value-selector-container"
        });
        const valueTogglerContainer = valueSelectorContainer.createDiv({
            cls: "metadata-menu-value-selector-toggler"
        });
        const valueToggler = new ToggleComponent(valueTogglerContainer);
        this.options.forEach(options => {
            if (options == presetOption) {
                valueToggler.setValue(true)
            };
        });
        valueToggler.onChange(value => {
            if (value && !this.options.includes(presetOption)) {
                this.options.push(presetOption);
            };
            if (!value) {
                this.options.remove(presetOption);
            };
        });
        const valueLabel = valueSelectorContainer.createDiv({ cls: "metadata-menu-value-selector-label" });
        valueLabel.setText(presetOption);
    };
};