import Managers from "src/fields/fieldManagers/Managers";

export const enum FieldType {
    'Input' = "Input",
    'Select' = "Select",
    'Multi' = "Multi",
    'Cycle' = "Cycle",
    'Boolean' = "Boolean",
    "Number" = "Number",
    "File" = "File",
    "Date" = "Date"
}

export const FieldTypeLabelMapping: Record<keyof typeof FieldType, FieldType> = {
    "Input": FieldType.Input,
    "Select": FieldType.Select,
    "Multi": FieldType.Multi,
    "Cycle": FieldType.Cycle,
    "Boolean": FieldType.Boolean,
    "Number": FieldType.Number,
    "File": FieldType.File,
    "Date": FieldType.Date
};

export const FieldTypeTagClass: Record<keyof typeof FieldType, string> = {
    "Input": "single",
    "Select": "select",
    "Multi": "multi",
    "Cycle": "cycle",
    "Boolean": "boolean",
    "Number": "number",
    "File": "file",
    "Date": "date"
}

export const FieldTypeTooltip: Record<keyof typeof FieldType, string> = {
    "Input": "Accept any value",
    "Select": "Accept a single value from a list",
    "Multi": "Accept multiple values from a list",
    "Cycle": "Cycle through values from a list",
    "Boolean": "Accept true of false",
    "Number": "Accept a number",
    "File": "Accept a link to a file in your vault",
    "Date": "Accept a date"
}

export const FieldManager: Record<keyof typeof FieldType, any> = {
    "Input": Managers.Input,
    "Select": Managers.Select,
    "Multi": Managers.Multi,
    "Cycle": Managers.Cycle,
    "Boolean": Managers.Boolean,
    "Number": Managers.Number,
    "File": Managers.File,
    "Date": Managers.Date
}

export const FieldIcon: Record<keyof typeof FieldType, string> = {
    "Input": "pencil",
    "Select": "right-triangle",
    "Multi": "bullet-list",
    "Cycle": "switch",
    "Boolean": "checkmark",
    "Number": "plus-minus-glyph",
    "File": "link",
    "Date": "calendar-with-checkmark"
}