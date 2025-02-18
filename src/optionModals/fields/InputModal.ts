import { App, DropdownComponent, Modal, setIcon, TextAreaComponent, TextComponent, TFile } from "obsidian";
import { insertValues } from "src/commands/insertValues";
import { replaceValues } from "src/commands/replaceValues";
import Field from "src/fields/Field";

export default class InputModal extends Modal {

    private file: TFile;
    private value: string;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private after: boolean;
    private field: Field;
    private templateValues: Record<string, string> = {};
    private renderedValue: TextAreaComponent;

    constructor(app: App, file: TFile, field: Field, value: string, lineNumber: number = -1, inFrontMatter: boolean = false, after: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.field = field;
        this.value = value;
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.after = after;
    };

    onOpen() {
        const inputDiv = this.contentEl.createDiv();
        if (this.field.options.template) {
            const templateFieldRegex = new RegExp(`\\{\\{(?<field>[^\\}]+?)\\}\\}`, "gu");
            const tF = this.field.options.template.matchAll(templateFieldRegex)
            let next = tF.next();
            while (!next.done) {
                if (next.value.groups) {
                    const value = next.value.groups.field
                    const [name, optionsString] = value.split(":").map(v => v.trim())
                    this.templateValues[name] = "";
                    if (optionsString) {
                        const options = JSON.parse(optionsString);
                        this.buildTemplateSelectItem(inputDiv, name, options);
                    } else {
                        this.buildTemplateInputItem(inputDiv, name);
                    }
                }
                next = tF.next()
            }
            this.buildResultPreview(inputDiv);
            this.buildSaveBtn(inputDiv);
        } else {
            this.buildInputEl(inputDiv);
        }
    };

    private renderValue() {
        let renderedString = this.field.options.template.slice()
        Object.keys(this.templateValues).forEach(k => {
            const fieldRegex = new RegExp(`\\{\\{${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(:[^\\}]*)?\\}\\}`, "u")
            renderedString = renderedString.replace(fieldRegex, this.templateValues[k])
        })

        this.renderedValue.setValue(renderedString)
    }

    private buildTemplateInputItem(inputDiv: HTMLDivElement, name: string) {
        inputDiv.createDiv({ text: name, cls: "metadata-menu-input-label" });
        const inputEl = new TextComponent(inputDiv);
        inputEl.setPlaceholder(`Enter a value for ${name}`);
        inputEl.inputEl.addClass("metadata-menu-prompt-input");
        inputEl.onChange(value => {
            this.templateValues[name] = value;
            this.renderValue();
        });
    }

    private buildTemplateSelectItem(inputDiv: HTMLDivElement, name: string, options: string[]) {
        inputDiv.createDiv({ text: name, cls: "metadata-menu-input-label" });
        const selectEl = new DropdownComponent(inputDiv);
        selectEl.addOption("", "--select--")
        options.forEach(o => selectEl.addOption(o, o));
        selectEl.onChange(value => {
            this.templateValues[name] = value;
            this.renderValue();
        })
    }

    private buildResultPreview(inputDiv: HTMLDivElement) {
        inputDiv.createEl("hr")
        inputDiv.createDiv({ text: "Result preview", cls: "metadata-menu-input-label" });
        const renderedValueContainer = inputDiv.createDiv();
        this.renderedValue = new TextAreaComponent(renderedValueContainer)
        this.renderedValue.inputEl.addClass("metadata-menu-prompt-input");
        this.renderedValue.inputEl.rows = 3;
        this.renderedValue.setValue(this.value);
    }

    private buildSaveBtn(inputDiv: HTMLDivElement) {
        inputDiv.createEl("hr")
        const saveBtnContainer = inputDiv.createDiv({ cls: "metadata-menu-textarea-buttons" })
        const saveBtn = saveBtnContainer.createEl("button")
        setIcon(saveBtn, "checkmark");
        saveBtn.onclick = () => {
            let inputValue = this.renderedValue.getValue();
            if (this.lineNumber == -1) {
                replaceValues(this.app, this.file, this.field.name, inputValue);
            } else {
                insertValues(this.app, this.file, this.field.name, inputValue, this.lineNumber, this.inFrontmatter, this.after);
            };
            this.close();
        }
    }

    private buildInputEl(inputDiv: HTMLDivElement): void {
        const form = inputDiv.createEl("form");
        form.type = "submit";

        const inputEl = new TextComponent(form);
        inputEl.inputEl.focus();
        inputEl.setValue(this.value);
        inputEl.inputEl.addClass("metadata-menu-prompt-input");

        form.onsubmit = async (e: Event) => {
            e.preventDefault();
            let inputValue = inputEl.getValue();
            if (this.lineNumber == -1) {
                replaceValues(this.app, this.file, this.field.name, inputValue);
            } else {
                insertValues(this.app, this.file, this.field.name, inputValue, this.lineNumber, this.inFrontmatter, this.after);
            };
            this.close();
        };
    };
};