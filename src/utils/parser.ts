export const fieldComponents = ['inList', 'startStyle', 'attribute', 'endStyle', 'beforeSeparatorSpacer', 'afterSeparatorSpacer', 'values']

export const genericFieldRegex = "(?<inList>- )?(?<startStyle>[_\\*~`]*)(?<attribute>[0-9\\w\\p{Letter}\\p{Emoji_Presentation}][-0-9\\w\\p{Letter}\\p{Emoji_Presentation}\\s]*)(?<endStyle>[_\\*~`]*)(?<beforeSeparatorSpacer>\\s*)";

export const inlineFieldRegex = (attribute: string) => `(?<inList>- )?(?<startStyle>[_\\*~\`]*)(?<attribute>${attribute})(?<endStyle>[_\\*~\`]*)(?<beforeSeparatorSpacer>\\s*)::(?<afterSeparatorSpacer>\\s*)(?<values>[^\\]]*)`;

export const fullLineRegex = new RegExp(`^${genericFieldRegex}::\s*(?<values>.*)?`, "u");

//search for them
export const inSentenceRegexBrackets = new RegExp(`\\[${genericFieldRegex}::\s*(?<values>[^\\]]+)?\\]`, "gu");
export const inSentenceRegexPar = new RegExp(`\\(${genericFieldRegex}::\s*(?<values>[^\\]]+)?\\)`, "gu");

export const encodeLink = (value: string): string => {
    /* replace link brackets by "impossible" combination of characters so that they won't be mixed up with inSentence field brackets when seaching with regex*/
    return value ? value
        .replace(/\[\[/g, "🔧🐀")
        .replace(/\]\]/g, "🐓🕌") : value
}

export const decodeLink = (value: string): string => {
    /* replace link brackets by "impossible" combination of characters so that they won't be mixed up with inSentence field brackets when seaching with regex*/
    return value ? value
        .replace(/🔧🐀/gu, "[[")
        .replace(/🐓🕌/gu, "]]") : value
}

export const getLineFields = (line: string): { attribute: string, values: string, index: number, length: number }[] => {
    const fields: { attribute: string, values: string, index: number, length: number }[] = []
    const fR = line.match(fullLineRegex);
    if (fR?.groups) {
        const { attribute, values } = fR?.groups
        fields.push({ attribute, values, index: 0, length: line.length })
    } else {
        const sRBk = encodeLink(line).matchAll(inSentenceRegexBrackets);
        let next = sRBk.next();
        while (!next.done) {
            if (next.value.groups) {
                const { attribute, values } = next.value.groups;
                fields.push({ attribute, values: decodeLink(values), index: next.value.index || 0, length: next.value[0].length });
            }
            next = sRBk.next();
        }
        const sRBc = encodeLink(line).matchAll(inSentenceRegexPar);
        next = sRBc.next();
        while (!next.done) {
            if (next.value.groups) {
                const { attribute, values } = next.value.groups;
                fields.push({ attribute, values: decodeLink(values), index: next.value.index || 0, length: next.value[0].length });
            }
            next = sRBc.next();
        }
    }
    fields.sort((a, b) => {
        if (a.index < b.index) return -1;
        if (a.index > b.index) return 1;
        return 0
    })
    return fields
}   