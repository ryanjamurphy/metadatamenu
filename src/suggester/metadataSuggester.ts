import MetadataMenu from "main";
import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    MarkdownView,
    TFile,
    parseYaml,
    Notice
} from "obsidian";
import { createFileClass, FileClass } from "src/fileClass/fileClass";
import { FieldManager, FieldType } from "src/types/fieldTypes";
import { genericFieldRegex, getLineFields, encodeLink } from "../utils/parser";
import FileField from "src/fields/fieldManagers/FileField";

interface IValueCompletion {
    value: string;
};

export default class ValueSuggest extends EditorSuggest<IValueCompletion> {
    private plugin: MetadataMenu;
    private app: App;
    private fileClass: FileClass;
    private inFrontmatter: boolean = false;
    private inFullLine: boolean = false;
    private inSentence: boolean = false;
    private didSelect: boolean = false

    constructor(app: App, plugin: MetadataMenu) {
        super(app);
        this.app = app;
        this.plugin = plugin;
        this.setInstructions([{ command: "Shift", purpose: "put a space after::" }]);

        // @ts-ignore
        this.scope.register(["Shift"], "Enter", (evt: KeyboardEvent) => {
            // @ts-ignore
            this.suggestions.useSelectedItem(evt);
            return false;
        });
    };

    onTrigger(
        cursor: EditorPosition,
        editor: Editor,
        file: TFile
    ): EditorSuggestTriggerInfo | null {
        if (this.didSelect) {
            this.didSelect = false
            return null
        }
        if (!this.plugin.settings.isAutosuggestEnabled) {
            return null;
        };
        //@ts-ignore
        const frontmatter = this.plugin.app.metadataCache.getFileCache(file).frontmatter;
        const fullLine = editor.getLine(editor.getCursor().line)
        this.inFrontmatter = frontmatter !== undefined && frontmatter.position.start.line < cursor.line && cursor.line < frontmatter.position.end.line
        if (this.inFrontmatter) {
            const regex = new RegExp(`^${genericFieldRegex}:(?<values>.*)`, "u");
            if (!regex.test(fullLine)) return null;
        } else if (getLineFields(fullLine).length === 0) {
            return null;
        }
        return {
            start: cursor,
            end: cursor,
            query: editor.getLine(cursor.line),
        };
    };

    private filterOption = (firstValues: string[] | undefined, lastValue: string | undefined, option: string): boolean => {
        return !firstValues ||
            !firstValues?.contains(encodeLink(option)) && (!lastValue ||
                !!lastValue && encodeLink(option).contains(lastValue))
    }

    async getSuggestions(context: EditorSuggestContext): Promise<IValueCompletion[]> {
        const suggestions = await this.getValueSuggestions(context);
        if (suggestions.length) {
            return suggestions;
        }
        return [];
    };

    async getValueSuggestions(context: EditorSuggestContext): Promise<IValueCompletion[]> {
        const lineNumber = context.start.line;
        const matchField: { attribute?: string, values?: string } = { attribute: undefined, values: "" }
        if (!this.inFrontmatter) {
            const lineFields = getLineFields(encodeLink(context.editor.getLine(lineNumber)));
            const position = context.editor.getCursor().ch
            const activeLineField = lineFields.find(lineField => lineField.index <= position && lineField.index + lineField.length >= position)
            if (activeLineField) {
                this.inSentence = activeLineField.index > 0;
                this.inFullLine = activeLineField.index === 0;
                matchField.attribute = activeLineField.attribute;
                matchField.values = activeLineField.values;
            }
        } else {
            const regex = new RegExp(`^${genericFieldRegex}:(?<values>.+)?`, "u");
            const regexResult = context.editor.getRange({ line: lineNumber, ch: 0 }, context.end).match(regex);
            if (regexResult?.groups) {
                matchField.attribute = regexResult.groups.attribute;
                matchField.values = regexResult.groups.values;
            }
        };

        if (matchField.attribute) {
            const fieldName = matchField.attribute;
            const valuesList = matchField.values?.replace(/^\[|^\s\[|^\(|^\s\(/, '')
                .replace(/\]$|\)$/, '')
                .split(",").map(o => encodeLink(o.trim()))
            const lastValue = valuesList?.last()
            const firstValues = valuesList?.slice(0, -1)
            //tags specific cas
            if (fieldName === "tags" && this.inFrontmatter) {
                //@ts-ignore
                return Object.keys(this.app.metadataCache.getTags())
                    .filter(t => lastValue ? t.contains(lastValue) : t)
                    .sort()
                    .map(tag => Object({ value: tag.replace(/^#/, "") }))
            }
            //if this note has a fileClass, check if field options are defined in the FileClass
            const cache = this.plugin.app.metadataCache.getCache(context.file.path);
            let tryWithPresetField = !cache?.frontmatter;
            if (cache?.frontmatter) {
                const { position, ...attributes } = cache.frontmatter;
                const fileClassAlias = this.plugin.settings.fileClassAlias;
                if (Object.keys(attributes).contains(fileClassAlias)) {
                    const fileClassValue = attributes[fileClassAlias];
                    try {
                        const fileClass = await createFileClass(this.plugin, fileClassValue);
                        this.fileClass = fileClass;
                        const fileClassAttributes = this.fileClass.attributes;
                        if (fileClassAttributes.map(attr => attr.name).contains(fieldName)) {
                            const field = fileClassAttributes
                                .find(attr => attr.name == fieldName)!.getField()
                            if ([FieldType.Cycle, FieldType.Multi, FieldType.Select].contains(field.type)) {
                                const filteredOptions = Array.isArray(field.options) ?
                                    field.options.filter(option => this.filterOption(firstValues, lastValue, option)) :
                                    Object.keys(field.options)
                                        .map(k => field.options[k])
                                        .filter(option => this.filterOption(firstValues, lastValue, option))
                                return filteredOptions.map(option => Object({ value: option }));
                            } else if (field.type === FieldType.File) {
                                const fieldManager: FileField = new FieldManager[field.type](field)
                                const files = fieldManager.getFiles();
                                if (lastValue) {
                                    return files
                                        .filter(f => f.basename.includes(lastValue))
                                        .map(f => Object({ value: FileField.buildMarkDownLink(app, context.file, f.basename) }));
                                } else {
                                    return files
                                        .map(f => Object({ value: FileField.buildMarkDownLink(app, context.file, f.basename) }));
                                }
                            } else {
                                return []
                            }
                        }
                    } catch (error) {
                        tryWithPresetField = true;
                    };
                } else {
                    tryWithPresetField = true;
                };
            };
            if (tryWithPresetField) {
                //else check if there are global preset voptiosalues
                const presetField = this.plugin.settings.presetFields.find(field => field.name == fieldName);
                if (presetField) {
                    if ([FieldType.Cycle, FieldType.Multi, FieldType.Select].contains(presetField.type)) {
                        if (presetField.valuesListNotePath) {
                            //override presetValues if there is a valuesList
                            const valuesFile = this.plugin.app.vault.getAbstractFileByPath(presetField.valuesListNotePath);
                            if (valuesFile instanceof TFile && valuesFile.extension == "md") {
                                const values: { value: string }[] = await (await this.plugin.app.vault.read(valuesFile)).split("\n")
                                    .filter(option => this.filterOption(firstValues, lastValue, option))
                                    .map(_value => Object({ value: _value }))
                                return values;
                            };
                        };
                        const values = Object.entries(presetField.options).map(option => option[1])
                            .filter(option => this.filterOption(firstValues, lastValue, option))
                        return values
                            .map(_value => Object({ value: _value }))

                    } else if (presetField.type === FieldType.File) {
                        const fieldManager: FileField = new FieldManager[presetField.type](presetField)
                        const files = fieldManager.getFiles();
                        if (lastValue) {
                            return files
                                .filter(f => f.basename.includes(lastValue))
                                .map(f => Object({ value: FileField.buildMarkDownLink(app, context.file, f.basename) }));
                        } else {
                            return files
                                .map(f => Object({ value: FileField.buildMarkDownLink(app, context.file, f.basename) }));
                        }
                    } else {
                        return []
                    }
                };
            };
        };
        return [];
    };

    renderSuggestion(suggestion: IValueCompletion, el: HTMLElement): void {
        el.setText(suggestion.value);
    };

    selectSuggestion(suggestion: IValueCompletion, event: KeyboardEvent | MouseEvent): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            return;
        };
        const editor = activeView.editor;
        const activeLine = editor.getLine(this.context!.start.line);

        if (this.inFrontmatter) {
            //format list if in frontmatter
            try {
                let parsedField: Record<string, string | string[] | null> = parseYaml(activeLine)
                let [attr, pastValues] = Object.entries(parsedField)[0]
                let newField: string
                if (!pastValues) {
                    newField = attr + ": " + suggestion.value;
                } else if (typeof pastValues == 'string') {
                    if (!pastValues.contains(",")) {
                        newField = attr + ": " + suggestion.value;
                    } else {
                        newField = attr + ": [" + pastValues.split(",").map(o => o.trim()).slice(0, -1).join(', ') + ", " + suggestion.value + "]";
                    }
                } else if (Array.isArray(pastValues)) {
                    if (activeLine.endsWith(",]") || activeLine.endsWith(", ]")) {
                        //value can be directly added since parseYaml wont create an empty last item in pastValues
                        newField = attr + ": [" + [...pastValues, suggestion.value].join(", ") + "]";
                    } else {
                        //we have typed something that we ahve to remove to replace with selected value
                        newField = attr + ": [" + [...pastValues.slice(0, -1), suggestion.value].join(", ") + "]";
                    }

                } else {
                    newField = attr + ": [" + [...pastValues].join(", ") + "]";
                }
                editor.replaceRange(newField, { line: this.context!.start.line, ch: 0 }, { line: this.context!.start.line, ch: activeLine.length });
                if (Array.isArray(pastValues) || typeof pastValues === 'string' && pastValues.contains(",")) {
                    editor.setCursor({ line: this.context!.start.line, ch: newField.length - 1 })
                } else {
                    editor.setCursor({ line: this.context!.start.line, ch: newField.length })
                }
            } catch (error) {
                new Notice("Frontmatter wrongly formatted", 2000)
                this.close()
                return
            }
        } else if (this.inFullLine) {
            let cleanedLine = activeLine
            while (![',', ':'].contains(cleanedLine.charAt(cleanedLine.length - 1))) {
                cleanedLine = cleanedLine.slice(0, -1)
            }
            editor.replaceRange(`${cleanedLine}${event.shiftKey ? " " : ""}` + suggestion.value,
                { line: this.context!.start.line, ch: 0 }, this.context!.end);
        } else if (this.inSentence) {
            const position = this.context?.editor.getCursor().ch || 0
            let beforeCursor = activeLine.slice(0, position)
            let afterCursor = activeLine.slice(position)
            let separatorPos = position;
            let currentValueLength = 0;
            while (!beforeCursor.endsWith("::") && !beforeCursor.endsWith(",") && beforeCursor.length) {
                separatorPos = separatorPos - 1;
                currentValueLength = currentValueLength + 1
                beforeCursor = beforeCursor.slice(0, -1);
            }
            let nextBracketPos = position;
            while (!encodeLink(afterCursor).match("(\\]|\\)).*") && afterCursor.length) {
                nextBracketPos = nextBracketPos + 1;
                afterCursor = afterCursor.slice(nextBracketPos - position);
            }
            editor.replaceRange(
                suggestion.value,
                { line: this.context!.start.line, ch: separatorPos },
                { line: this.context!.start.line, ch: nextBracketPos }
            )
            editor.setCursor({ line: this.context!.start.line, ch: nextBracketPos - currentValueLength + suggestion.value.length })
        }
        this.didSelect = true
        this.close()
    };
};