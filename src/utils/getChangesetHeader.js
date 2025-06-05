function getChangesetHeader(config, type = "txt", changesetName) {
    return `${type == "sql" ? '--': '#'} ***            Changeset ${config.realCurrentBranch || changesetName || config.finalChangesetName}          ***`
}

export default getChangesetHeader;