function getChangesetHeader(config, sql, changesetName) {
    return `${sql ? '--': '#'} ***            Changeset ${config.realBranchName || changesetName || config.finalChangesetName}          ***`
}

export default getChangesetHeader;