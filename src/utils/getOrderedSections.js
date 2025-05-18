function getOrderedSections() {
    // order matters here.
    // this array specifies correct order by which sections should be processed

    return [
        "customStart",
        "assemblies",
        "schemas",
        "types",
        "sequences",
        "tables",
        "relations",
        "functions",
        "synonyms",
        "procedures",
        "queues",
        "views",
        "indexes",
        "triggers",
        "statistics",
        "customEnd",
    ]
}

export default getOrderedSections;