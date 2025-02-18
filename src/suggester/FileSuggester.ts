// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes

import { App, TAbstractFile, TFile } from "obsidian";
import { TextInputSuggest } from "./suggest";
import { get_tfiles_from_folder } from "../utils/fileUtils";
import TemplaterPlugin from "main";

export class FileSuggest extends TextInputSuggest<TFile> {
    constructor(
        public app: App,
        public inputEl: HTMLInputElement,
        private plugin: TemplaterPlugin,
        public folder: string
    ) {
        super(app, inputEl);
    }

    getSuggestions(input_str: string): TFile[] {
        const all_files = []
        try {
            all_files.push(...get_tfiles_from_folder(this.app, this.folder))
        } catch (error) {

        }
        const files: TFile[] = [];
        const lower_input_str = input_str.toLowerCase();

        all_files.forEach((file: TAbstractFile) => {
            if (
                file instanceof TFile &&
                file.extension === "md" &&
                file.path.toLowerCase().contains(lower_input_str)
            ) {
                files.push(file);
            }
        });

        return files;
    }

    renderSuggestion(file: TFile, el: HTMLElement): void {
        el.setText(file.path);
    }

    selectSuggestion(file: TFile): void {
        this.inputEl.value = file.path;
        this.inputEl.trigger("input");
        this.close();
    }
}
