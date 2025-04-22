function gitignoreContent() {
    return `# SQL Server files
*.mdf
*.ldf
*.ndf

# User-specific files
*.rsuser
*.suo
*.user
*.userosscache
*.sln.docstates

# User-specific files (MonoDevelop/Xamarin Studio)
*.userprefs

# Visual Studio cache files
.vs/

# Node.js
node_modules/

# Dist and publish
/dist
/publish

# Microsoft Azure
csx/
*.build.csdef

# pdcsc-config
pdcsc-config.development.json
pdcsc-config.production.json

# Logs and backups
/Changes/error.log
/Changes/*~.txt
`;
}

export default gitignoreContent;
