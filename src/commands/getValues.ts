import { App, TFile } from "obsidian"
import { inlineFieldRegex, encodeLink, decodeLink } from "src/utils/parser";

export async function getValues(app: App, fileOrfilePath: TFile | string, attribute: string): Promise<string[]> {
    let file: TFile;
    if (fileOrfilePath instanceof TFile) {
        file = fileOrfilePath;
    } else {
        const _file = app.vault.getAbstractFileByPath(fileOrfilePath)
        if (_file instanceof TFile && _file.extension == "md") {
            file = _file;
        } else {
            throw Error("path doesn't correspond to a proper file");
        }
    }
    const content = (await app.vault.cachedRead(file)).split('\n');
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const { position: { start, end } } = frontmatter ? frontmatter : { position: { start: undefined, end: undefined } };
    const result: string[] = [];
    content.map((line, i) => {
        if (frontmatter && i >= start.line && i <= end.line) {
            const regex = new RegExp(`${attribute}:(.*)`, 'u');
            const r = line.match(regex);
            if (r && r.length > 0) result.push(r[1]);
        } else {
            const fullLineRegex = new RegExp(`^${inlineFieldRegex(attribute)}`, "u");
            const fR = encodeLink(line).match(fullLineRegex);
            if (fR?.groups) { result.push(decodeLink(fR.groups.values)) };
            const inSentenceRegexBrackets = new RegExp(`\\[${inlineFieldRegex(attribute)}\\]`, "gu");
            const sRB = encodeLink(line).matchAll(inSentenceRegexBrackets);
            let next = sRB.next();
            while (!next.done) {
                if (next.value.groups) { result.push(decodeLink(next.value.groups.values)) }
                next = sRB.next()
            }
            const inSentenceRegexPar = new RegExp(`\\(${inlineFieldRegex(attribute)}\\)`, "gu");
            const sRP = encodeLink(line).matchAll(inSentenceRegexPar);
            next = sRP.next();
            while (!next.done) {
                if (next.value.groups) { result.push(decodeLink(next.value.groups.values)) }
                next = sRP.next()
            }
        }
    })
    return result;
}