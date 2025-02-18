import { TFile } from "obsidian";

interface FileClassQuery {
    id: string;
    name: string;
    query: string;
    fileClassName: string;
}

class FileClassQuery {

    constructor(name: string = "",
        id: string = "",
        query: string = "",
        fileClassName: string = ""
    ) {
        this.name = name;
        this.query = query;
        this.id = id;
        this.fileClassName = fileClassName;
    };

    public matchFile(file: TFile): boolean {
        //@ts-ignore
        const getResults = (api: DataviewPlugin["api"]) => {
            try {
                return (new Function("dv", `return ${this.query}`))(api)
            } catch (error) {
                throw Error(`Wrong query for field <${this.name}>. Check your settings`)
            }
        };
        const dataview = app.plugins.plugins["dataview"]
        //@ts-ignore
        if (this.query && dataview?.settings.enableDataviewJs && dataview?.settings.enableInlineDataviewJs) {
            try {
                const filesPath = getResults(dataview.api).values.map((v: any) => v.file.path) as string[]
                return filesPath.includes(file.path);
            } catch (error) {
                return false;
            }
        } else {
            return false;
        }
    }

    static copyProperty(target: FileClassQuery, source: FileClassQuery) {
        target.id = source.id;
        target.name = source.name;
        target.query = source.query;
        target.fileClassName = source.fileClassName
    };
};

export default FileClassQuery;