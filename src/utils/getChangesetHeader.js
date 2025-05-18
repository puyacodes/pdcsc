function getChangesetHeader(config, type = "txt", changesetName) {
    return `${type == "sql" ? '--': '#'} ***            Changeset ${config.realBranchName || changesetName || config.finalChangesetName}          ***`
}

export default getChangesetHeader;