const normalizeFileName = (fileName) => {
    return fileName.trim().split("/").pop().replace(/^dbo\./i, "");
};

export default normalizeFileName;