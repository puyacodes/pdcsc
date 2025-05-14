import { isBool } from "@locustjs/base";

function createSectionsStore(allArray) {
    const result = {
        procedures: [],
        functions: [],
        tables: [],
        relations: [],
        types: [],
        views: [],
        indexes: [],
        triggers: [],
        schemas: [],
        sequences: [],
        synonyms: [],
        queues: [],
        assemblies: [],
        statistics: [],
    }

    if (isBool(allArray)) {
        if (allArray) {
            result.customStart = [];
            result.customEnd = [];
        } else {
            result.customStart = "";
            result.customEnd = "";
        }
    }

    return result;
}

export default createSectionsStore;