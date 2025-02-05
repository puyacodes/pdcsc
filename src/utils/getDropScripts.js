function getDropScripts(deletedFiles, folders) {
    const folderToObjectMap = {
        [folders.Procedures]: "PROCEDURE",
        [folders.Functions]: "FUNCTION",
        [folders.Tables]: "TABLE",
        [folders.Relations]: "FOREIGN KEY",
        [folders.Types]: "TYPE",
        [folders.Views]: "VIEW",
        [folders.Indexes]: "INDEX",
        [folders.Triggers]: "TRIGGER",
        [folders.Schemas]: "SCHEMA"
    };

    const generateDropQuery = (objectType, objectName) => {
        switch (objectType) {
            case "PROCEDURE":
            case "FUNCTION":
                return `IF OBJECT_ID(N'${objectName}', N'${objectType[0]}') IS NOT NULL
DROP ${objectType} ${objectName};
GO`;

            case "TABLE":
                return `/*Note: Drop Table
IF OBJECT_ID(N'${objectName}', N'U') IS NOT NULL
DROP TABLE ${objectName};
GO*/`;

            case "FOREIGN KEY":
                return `/*Note: Drop the FOREIGN KEY from its table
ALTER TABLE table_name DROP CONSTRAINT ${objectName};
GO*/`;

            case "TYPE":
                return `IF EXISTS (SELECT 1 FROM sys.types WHERE name = '${objectName}')
DROP TYPE ${objectName};
GO`;

            case "VIEW":
                return `IF OBJECT_ID(N'${objectName}', N'V') IS NOT NULL
DROP VIEW ${objectName};
GO`;

            case "INDEX":
                return `/*Note: Drop the index from its table
DROP INDEX ${objectName} ON table_name;
GO*/`;

            case "TRIGGER":
                return `IF OBJECT_ID(N'${objectName}', N'TR') IS NOT NULL
DROP TRIGGER ${objectName};
GO`;

            case "SCHEMA":
                return `IF EXISTS (SELECT 1 FROM sys.schemas WHERE name = '${objectName}')
DROP SCHEMA ${objectName};
GO`;

            default:
                return null;
        }
    };

    const dropQuery = deletedFiles
        .map(file => {
            const parts = file.split('/');
            const folderName = parts[1]; // exp: 07-Procedures
            const objectName = parts.slice(parts.length - 1).join('.').replace('.sql', ''); // exp: dbo.sp01

            const objectType = folderToObjectMap[folderName];
            if (!objectType) return null;

            // Generate the appropriate DROP query
            return generateDropQuery(objectType, objectName);
        })
        .filter(query => query) // Remove null values
        .join('\n'); // Combine queries

    return dropQuery;
}

module.exports = { getDropScripts }