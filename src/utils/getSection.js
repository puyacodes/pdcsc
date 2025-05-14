function getSection(line) {
    let result;

    if (line.startsWith('##')) {
        if (line.containsAny("Custom-Start", "CustomStart")) {
            result = "customStart";
        } else if (line.containsAny("Custom-End", "CustomEnd")) {
            result = "customEnd";
        } else if (line.contains("Schema")) {
            result = "schemas";
        } else if (line.contains("Type")) {
            result = "types";
        } else if (line.contains("Table")) {
            result = "tables";
        } else if (line.contains("Relation")) {
            result = "relations";
        } else if (line.containsAny("Function", "Udf")) {
            result = "functions";
        } else if (line.containsAny("Procedure", "SPROC")) {
            result = "procedures";
        } else if (line.contains("View")) {
            result = "views";
        } else if (line.contains("Index")) {
            result = "indexes";
        } else if (line.contains("Trigger")) {
            result = "triggers";
        } else if (line.contains("Sequence")) {
            result = "sequences";
        } else if (line.contains("Synonym")) {
            result = "synonyms";
        } else if (line.contains("Statistics")) {
            result = "statistics";
        } else if (line.containsAny("Queue", "ServiceQueue", "Service Queue")) {
            result = "queues";
        } else if (line.containsAny("Assembly", "Assemblies")) {
            result = "assemblies";
        }
    }

    return result;
}

export default getSection;