function getSectionMarker(section) {
    let result;

    switch (section) {
        case "customStart": result = "Custom-Start"; break;
        case "schemas": result = "Schemas"; break;
        case "assemblies": result = "Assemblies"; break;
        case "types": result = "Types"; break;
        case "synonyms": result = "Synonyms"; break;
        case "sequences": result = "Sequences"; break;
        case "queues": result = "Service Queues"; break;
        case "statistics": result = "Statistics"; break;
        case "functions": result = "Functions"; break;
        case "procedures": result = "Procedures"; break;
        case "tables": result = "Tables"; break;
        case "relations": result = "Relations"; break;
        case "views": result = "Views"; break;
        case "indexes": result = "Indexes"; break;
        case "triggers": result = "Triggers"; break;
        case "customEnd": result = "Custom-End"; break;
    }

    return result;
}

export default getSectionMarker;