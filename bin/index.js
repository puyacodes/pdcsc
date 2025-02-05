#!/usr/bin/env node
"use strict";var e=require("fs"),n=require("path"),t=require("simple-git"),s=require("child_process"),a=require("semver"),r=require("jalali-moment"),o=require("mssql"),i=require("@locustjs/exception"),c=require("@puya/ts"),l=require("readline"),u=require("chalk");function d(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var p,f,g,m,h,b,w={};var y,S,C,E,F,$,N,T,x,O,I,P,D,A,R,k,v,M,L,j,q,B,V,U,_,Y,G,H,W,J,z,K,Q,X,Z,ee,ne,te,se,ae,re,oe,ie,ce,le,ue,de,pe,fe,ge,me,he,be,we,ye,Se,Ce,Ee={name:"@puya/pdcsc",version:"1.5.4"};function Fe(){if(E)return C;E=1;const{compareWithDevBranch:o}=function(){if(m)return g;m=1;const e=t;return g={compareWithDevBranch:async function(n,t){const s=e();try{if(s.checkIsRepo(((e,n)=>{!e&&n||(console.log("This is not a git repository."),process.exit(1))})),console.log("Fetching the latest updates from origin..."),await s.fetch(n.split("/")[0],n.split("/")[1]),!(await s.branch(["-r"])).all.includes(`${n}`))throw new Error(`Remote branch ${n} does not exist.`);const e=await s.raw(["merge-base",`${t}`,`${n}`]),a=await s.log({from:e.trim(),to:`${n}`});a.total>0&&(console.log(`Your branch '${t}' is behind ${n} by ${a.total} commits.`),console.log(`Please run git pull ${n} to sync with the latest changes.`),process.exit(1))}catch(e){console.error(`Error checking the ${n} branch:`,e.message||e),process.exit(1)}}}}(),i=function(){if(b)return h;b=1;const t=e,s=n;return h=function(e){if(e.database||(e.database={}),e.paths||(e.paths={}),e.pipeline||(e.pipeline="gitlabs"),e.paths.backupDir||(e.paths.backupDir="C:\\temp\\"),e.paths.changesetFolderName||(e.paths.changesetFolderName="Changes"),e.paths.scriptsFolderName||(e.paths.scriptsFolderName="Scripts"),e.paths.appVersionFormat||(e.paths.appVersionFormat="YYYY-MM-DD HH:mm:ss"),e.paths.timestampLocale||(e.paths.timestampLocale="en"),e.paths.masterBranchName||(e.paths.masterBranchName="origin/dev"),e.paths.changesetsTableName||(e.paths.changesetsTableName="Changesets"),e.appVersionSprocName||(e.appVersionSprocName="dbo.getAppVersion"),!e.database.server)throw new Error("server not specified");if(!e.database.user)throw new Error("user not specified");if(!e.database.password)throw new Error("password not specified");if(!e.database.databaseName)throw new Error("databaseName not specified");if(e.folders||(e.folders={procedures:"Procedures",functions:"Functions",tables:"Tables",relations:"Relations",types:"Types",views:"Views",indexes:"Indexes",triggers:"Triggers",schemas:"Schemas"}),!t.readdirSync(s.join(e.basePath,e.paths.scriptsFolderName)).some((n=>Object.values(e.folders).some((e=>n===e)))))throw new Error("Please specify the subfolders and their names in the 'folders' section of the config file.")}}(),{checkForUpdate:c}=function(){if(S)return y;S=1;const{execSync:e}=s,n=a,t=Ee;return y={checkForUpdate:async function(s){try{const a=t.version,r=e(`npm view ${t.name} version`,{encoding:"utf8"}).trim();n.gt(r,a)?(console.warn(`⚠️  Update available for ${t.name}: ${a} → ${r}`),console.log(`Run "npm update ${t.name}" to update.`)):s.options.debugMode&&console.log(`✅  ${t.name} is up-to-date! (version: ${a})`)}catch(e){console.error(`Failed to check for updates: ${e.message}`)}}}}();let l=r;const{execSync:u}=s,d=n;return C={initialize:async function(e){let n,t,s,a,r,p,f,g;i(e),await c(e),e.options.runOnPipline?(("gitlabs"===e.pipeline||"azuredevops"===e.pipeline)&&(n=process.env.CI_COMMIT_REF_NAME.trim().replace("/","-"),t=process.env.CI_COMMIT_REF_NAME),e.options.debugMode&&console.log(`Current Branch: ${t}`)):(n=u("git rev-parse --abbrev-ref HEAD",{encoding:"utf-8"}).trim().replace("/","-"),t=u("git rev-parse --abbrev-ref HEAD",{encoding:"utf-8"}).trim()),a=l().locale(e.paths.timestampLocale).format("YYYYMMDDHHmmss"),e.options.debugMode&&console.log("now:",a);const{paths:m}=e;return r=d.join(e.basePath,m.changesetFolderName),p=m.appVersionFormat,f=d.join(m.backupDir,`backup-${e.database.databaseName}-temp.bak`),s=m.timestampLocale,g=m.masterBranchName??"origin/dev",e.options.runOnPipline||e.options.runAllChangesets||await o(e.paths.masterBranchName,t),{currentBranch:n,realBranchName:t,timestampLocale:s,now:a,changesetPath:r,appVersionFormat:p,backupFile:f,masterBranchName:g}}}}function $e(){if($)return F;$=1;const t=e,s=n;class a{constructor(e,n){this.name=e,this.type=n}}function r(e){let n=[];return t.readdirSync(e).forEach((a=>{const o=s.join(e,a),i=t.statSync(o);i&&i.isDirectory()?n=n.concat(r(o)):o.endsWith(".sql")&&n.push(o)})),n}function o(e,n,o){const i=[],c=[],l=[],u=[],d=[];let p="",f="",g="";const m=[],h=t.readFileSync(e,"utf-8").split("\n");for(const e of h){const n=e.trim();n.startsWith("--")?n.includes("Procedure")||n.includes("SPROCs")?g="procedure":n.includes("Function")?g="function":n.includes("Tables")?g="table":n.includes("Types")?g="type":n.includes("Index")?g="index":n.includes("Trigger")?g="trigger":n.includes("Relation")?g="relation":n.includes("View")?g="view":n.includes("Custom-Start")?g="customStart":n.includes("Custom-End")&&(g="customEnd"):"customStart"===g?p+=`\n${n}`:"customEnd"===g?f+=`\n${n}`:n&&!n.startsWith("--")&&m.push(new a(n,g))}o&&console.log(`Total objects: ${m.length}\n`);const b=r(n);for(const e of m){let n=!1;for(const a of b){if(s.basename(a).includes(e.name)){const s=t.readFileSync(a,"utf-8");switch(e.type){case"procedure":i.push(s);break;case"function":c.push(s);break;case"table":l.push(s);break;case"relation":u.push(s);break;case"index":break;case"type":d.push(s)}n=!0,o&&console.log(`${e.type}: ${e.name} copied.`);break}}n||o&&console.log(`${e.type}: ${e.name} not found!`)}return`\n-- ===================== Custom-Start (start) ======================\n${p}\n-- ===================== Custom-Start ( end ) ======================\n\n-- ===================== Types (start) ======================\n${d.join("\n")}\n-- ===================== Types (end) ======================\n\n-- ===================== Tables (start) ======================\n${l.join("\n")}\n-- ===================== Tables (end) ======================\n\n-- ===================== Relations (start) ======================\n${u.join("\n")}\n-- ===================== Relations (end) ======================\n\n-- ===================== Functions (start) ======================\n${c.join("\n")}\n-- ===================== Functions (end) ======================\n\n-- ===================== SPROCs (start) ======================\n${i.join("\n")}\n-- ===================== SPROCs (end) ======================\n\n-- ===================== Custom-End (start) ======================\n${f}\n-- ===================== Custom-End ( end ) ======================\n    `}return F={processChangeset:function(e){return n=e.config,t=e.tempFileName,o(s.join(n.basePath,n.paths.changesetFolderName,`${t}.txt`),s.join(n.basePath,n.paths.scriptsFolderName),n.options.debugMode);var n,t}}}function Ne(){if(T)return N;T=1;const{Exception:e}=i;return N={ExecuteQueryException:class extends e{constructor(e,...n){super(...n),this.query=e}}}}function Te(){if(O)return x;O=1;const e=o,{ExecuteQueryException:n}=Ne();return x={executeQuery:async function({query:t,dbName:s,noCatch:a=!0,config:r}){let o,i;try{const n=await e.connect({user:r.database.user,password:r.database.password,server:r.database.server,database:s??r.database.databaseName,options:{encrypt:!1}});i=await n.request().query(t),await n.close(),i=i.recordset}catch(e){a?o=e:(console.log("Error fetching database file Groups:",o),i=!1)}if(o)throw new n(t,o);return i}}}function xe(){if(k)return R;k=1;const{getFileGroups:e}=function(){if(A)return D;A=1;const e=o;return D={getFileGroups:async function({config:n}){try{const t=await e.connect({user:n.database.user,password:n.database.password,server:n.database.server,database:n.database.databaseName,options:{encrypt:!1}}),s=`\n            SELECT\n                db.name AS DBName,\n                type_desc AS FileType,\n                Physical_Name AS Location,\n                mf.Name AS Name\n            FROM\n                sys.master_files mf\n            INNER JOIN \n                sys.databases db ON db.database_id = mf.database_id\n            WHERE db.name = '${n.database.databaseName}'\n        `;return result=await t.request().query(s),await t.close(),result.recordset}catch(e){throw new Error(`Error fetching database file Groups: ${e}`)}}}}();return R={generateRestoreCommand:async function({config:n,backupDbName:t,backupFile:s}){try{const a=await e({config:n}),r=a.map((e=>{const s=`${n.paths.backupDir}${t}_${e.Location.split("\\").pop()}`;return`MOVE '${e.Name}' TO '${s}'`})).join(", ");return`use master; RESTORE DATABASE [${t}] FROM DISK='${s}' WITH File = 1, ${r};`}catch(e){throw new Error(`Error generating restore command: ${e}`)}}}}function Oe(){if(j)return L;return j=1,L={extractDateFromString:function(e,n){try{let t;const s=/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/,a=n.match(s);if(a){const n=parseInt(a[1],10),s=parseInt(a[2],10),r=parseInt(a[3],10),o=parseInt(a[4],10),i=parseInt(a[5],10),c=a[6]?parseInt(a[6],10):0;t=new Date(Date.UTC(n,s-1,r,o,i,c));const l=t.toISOString().replace("T"," ").replace(/\.\d{3}Z/,"");return e.options.debugMode&&console.log("Extracted Date:",l),l}throw new Error("No date found in the input string.")}catch(e){throw new Error(e.message)}}}}function Ie(){if(B)return q;B=1;const{execSync:e}=s;return q={restoreCommitedChanges:function(n){e(`git reset --mixed HEAD~${n??1}`,{encoding:"utf-8"}).trim(),console.log("All commited changes are restored.")}}}function Pe(){if(U)return V;U=1;const a=e,r=n,{executeBatch:o}=function(){if(P)return I;P=1;const{executeQuery:e}=Te();return I={executeBatch:async function(n){var t=n.content.split(/\s+GO\s+/i);for(let s of t)await e({query:s,dbName:n.dbName,config:n.config})}}}(),{executeQuery:i}=Te(),{ExecuteQueryException:c}=Ne(),{generateRestoreCommand:l}=xe(),u=t,{execSync:d}=s,{fileNameWithoutExtension:p}=M?v:(M=1,v={fileNameWithoutExtension:function(e){const t=n;return t.basename(e,t.extname(e))}}),{extractDateFromString:f}=Oe(),{restoreCommitedChanges:g}=Ie();return V={backupAndRunScript:async function(e){const n=e.config.database.databaseName;let t,s=!1;try{if(!e.runAllChangesets){const t=await l({config:e.config,backupFile:e.backupFile,backupDbName:e.backupDbName});console.log("Creating database backup..."),await i({query:`BACKUP DATABASE[${n}]TO DISK = '${e.backupFile}' WITH INIT`,config:e.config}),e.config.options.debugMode&&console.log(`Database backup created at: ${e.backupFile}`),console.log("Restoring backup to temporary database..."),await i({query:t,config:e.config}),e.config.options.debugMode&&console.log(`Backup restored as: ${e.backupDbName}`),console.log("Executing script on temporary database...");const s=a.readFileSync(e.tempScript,"utf-8");await o({content:s,dbName:null,config:e.config}),e.config.options.debugMode?console.log(`Script executed successfully on database: ${e.backupDbName}`):console.log("Script executed successfully on temp database.")}if(e.runOnPipline||e.runAllChangesets){console.log(`Executing script on ${n} database...`);const t=a.readFileSync(e.tempScript,"utf-8");await o({content:t,dbName:n,config:e.config}),console.log(`Script executed successfully on database: ${n}`),e.runAllChangesets&&e.changesetsTableName&&await async function(e,n,t,s){await i({query:`IF OBJECTID('${e}', 'U') IS NULL CREATE TABLE ${e} (ID INT IDENTITY(1,1) PRIMARY KEY, [NAME] NVARCHAR(255) NOT NULL, [DATE] DATETIME NOT NULL);`,config:n});for(const a of t)try{const t=`INSERT INTO ${e} ([name], [date]) VALUES ('${p(a.file)}', '${f(n,s)}')`;await i({query:t,config:n}),console.log(`Inserted changeset: ${a.file}`)}catch(e){throw new Error(`Error inserting changeset ${a.file}: ${e}`)}console.log(`Changeset added successfully to ${e} table.`)}(e.changesetsTableName,e.config,e.pendingChangesets,e.now)}e.runOnPipline||e.runAllChangesets||(a.renameSync(e.tempScript,e.scriptFile),a.renameSync(e.temptxtfile,e.txtFile),console.log(`Script saved at: ${e.scriptFile}`)),e.runAllChangesets||await async function(e,n){await i({query:`DROP DATABASE[${e}]`,config:n}),n.options.debugMode?console.log(`Temporary database ${e} dropped successfully.`):console.log("Temporary database dropped successfully.")}(e.backupDbName,e.config),e.runOnPipline||e.runAllChangesets||(await async function(e){const n=u();try{for(let t of e)await n.add(t);await n.commit("Auto-Commit after generating changeset.")}catch(e){throw new Error(`Error during commiting changes: ${e}`)}}([e.txtFile,e.scriptFile]),s=!0)}catch(n){t=n,console.error("Error during script execution:",t.message);const s=r.join(e.changesetPath,"error.log");try{a.writeFileSync(s,"","utf-8");try{a.appendFileSync(s,JSON.stringify(t,null,4)+"\n\n","utf-8"),t instanceof c&&(a.appendFileSync(s,t.query+"\n\n","utf-8"),t.query=null)}catch(e){a.appendFileSync(s,e.message+"\n\n","utf-8"),a.appendFileSync(s,t.message,"utf-8")}console.error(`Error log written to: ${s}`)}catch(t){console.error(`Error creating log file: ${s}`)}await i({query:`IF EXISTS(SELECT name FROM sys.databases WHERE name = '${e.backupDbName}') DROP DATABASE[${e.backupDbName}]`,config:e.config})}finally{e.runOnPipline||e.runAllChangesets||(a.existsSync(e.tempScript)&&a.unlinkSync(e.tempScript),a.existsSync(e.temptxtfile)&&a.unlinkSync(e.temptxtfile),a.existsSync(e.backupFile)&&a.unlinkSync(e.backupFile)),e.runAllChangesets&&a.existsSync(e.tempScript)&&a.unlinkSync(e.tempScript)}if(t)throw"2"===e.userChoice||s?g():"2"===e.userChoice&&s&&g(2),new Error(t)}}}function De(){if(Y)return _;Y=1;const e=t;return _={validateChangedFiles:async function({status:n,listName:t,commit:s,folders:a,config:r}){const o=e(),i=Object.values(a),c=n.filter((e=>{const n=i.some((n=>e.startsWith(`${r.paths.scriptsFolderName}/${n}`))),t=e.endsWith(".sql");return n&&t}));if(r.options.debugMode&&console.log("filtered Uncommited files:",c),c.length>0)if(s){for(const e of c)await o.add(e);await o.commit("Auto-Commit before generating changeset.")}else t.push(...c.map((e=>e)))}}}function Ae(){if(oe)return re;oe=1;const e=l;return re={promptUser:function(n){const t=e.createInterface({input:process.stdin,output:process.stdout});return new Promise((e=>{t.question(n,(n=>{t.close(),e(n.trim())}))}))}}}function Re(){if(ue)return le;ue=1;const{promptUser:e}=Ae(),{validateChangedFiles:n}=De(),{getAllStatuses:s}=function(){if(ce)return ie;ce=1;const e=t;return ie={getAllStatuses:async function(n){const t=e(),s=n.status??await t.status(),a=[];return["not_added","conflicted","created","deleted","ignored","modified","renamed"].forEach((e=>{Array.isArray(s[e])&&e!=n.exclude&&a.push(...s[e])})),n.config.options.debugMode&&console.log("allStatuses",a),a}}}(),a=u;return le={getUserChoice:async function(t,r,o){const i=[];let c;for(;;){if(await n({status:await s({status:t,config:o}),listName:i,commit:!1,folders:r,config:o}),!(i.length>0)){c="1";break}if(console.warn("Warning: You have uncommitted changes. Only committed changes will be included in the script."),c=await e("Choose an option:\n1. Ignore changes and continue\n2. Commit changes and continue\n3. Show uncommitted changes.\n4. Cancel\nEnter your choice: "),"1"===c){console.log("Ignoring changes and continuing...");break}if("2"===c){console.log("Committing changes..."),await n({status:await s({status:t,config:o}),listName:null,commit:!0,folders:r,config:o});break}"3"===c?(i.length=0,t.modified.length>0&&(i.push(a.blue("Modified files:")),n({status:t.modified,listName:i,commit:!1,folders:r,config:o})),t.not_added.length>0&&(i.push(a.green("Untracked files:")),n({status:t.not_added,listName:i,commit:!1,folders:r,config:o})),t.deleted.length>0&&(i.push(a.red("Deleted files:")),n({status:t.deleted,listName:i,commit:!1,folders:r,config:o})),i.length>0?(console.log("Uncommitted changes:"),console.log(i.join("\n"))):console.log("No uncommitted changes found.")):"4"===c?(console.log("Operation cancelled by the user."),process.exit(0)):console.log("Invalid choice. Please enter a valid option.")}return c}}}function ke(){if(he)return me;he=1;const t=e,s=n,a=o,{executeQuery:r}=Te(),{extractDateFromString:i}=Oe();return me={getAllChangesetFiles:async function(e,n){try{const o=s.join(e.basePath,e.paths.changesetFolderName),c=s.join(o,`${n}-update-${e.database.databaseName}.sql`),l=await async function(e){await r({query:`IF OBJECT_ID('${e.paths.changesetsTableName}', 'U') IS NULL CREATE TABLE ${e.paths.changesetsTableName} (ID INT IDENTITY(1,1) PRIMARY KEY, [NAME] NVARCHAR(255) NOT NULL, [DATE] DATETIME NOT NULL);`,config:e});const n=await a.connect({user:e.database.user,password:e.database.password,server:e.database.server,database:e.database.databaseName,options:{encrypt:!1}});let t;try{t=await n.request().query(`\n                SELECT TOP 1 [date], [name]\n                FROM ${e.paths.changesetsTableName} \n                ORDER BY [date] DESC\n                `)}catch(n){throw n.message.includes("Invalid object name")?new Error(`${e.paths.changesetsTableName} table not found.`):new Error(`Error during select last executed changeset from ${e.paths.changesetsTableName}: ${n.message}`)}finally{a.close()}return t}(e),u=function(e,n,a){const r=t.readdirSync(n),o=r.filter((e=>".sql"===s.extname(e)));let c=a.recordset.length>0?a.recordset[0].name:null,l=a.recordset.length>0?i(e,c):null,u=[];for(const t of o){const a=s.join(n,t),r=t.match(/(\d{12,14})/);if(!r){e.options.debugMode&&console.warn(`Skipping file with invalid format: ${t}`);continue}let o=r[1],d=i(e,o);(!l||d>l&&t!=c)&&(t.includes("update")||u.push({file:t,fileDate:d,filePath:a}))}e.options.debugMode&&console.log("pendingChangesetsArray:",u.map((e=>e.file)));if(0===u.length)throw new Error("No new changesets found.");return u.sort(((e,n)=>e.fileDate-n.fileDate)),u}(e,o,l),d=function(e){let n="";for(const s of e){const e=t.readFileSync(s.filePath,"utf-8");n+=`-- Contents of ${s.file}\n`,n+=e+"\n\n"}const s=`\n/* \n    The update includes these changeset files:\n    ${e.map((e=>`File: ${e.file}`)).join("\n    ")}\n*/\n`;return n+=s,n}(u);return t.writeFileSync(c,d,"utf-8"),console.log("Pending changesets combined successfully!"),{allChangesetsScriptFilePath:c,pendingChangesets:u}}catch(e){e.message.includes("No new changesets found.")?(console.log(e.message),process.exit(0)):console.error("Error combining files:",e)}}}}function ve(){if(we)return be;we=1;const{processChangeset:a}=$e(),{backupAndRunScript:r}=Pe(),{validateChangedFiles:o}=De(),{validateChangeSetFile:i}=function(){if(H)return G;H=1;const n=e;return G={validateChangeSetFile:function(e){let t=n.readFileSync(e.changesetFilePath,"utf-8");const s=[{name:"Custom-Start",start:"-- ===================== Custom-Start (start) ======================",end:"-- ===================== Custom-Start ( end ) ======================"},{name:"Custom-End",start:"-- ===================== Custom-End (start) ======================",end:"-- ===================== Custom-End ( end ) ======================"},{name:"types",start:"-- ===================== Types (start) ======================",end:"-- ===================== Types ( end ) ======================"},{name:"tables",start:"-- ===================== Tables (start) ======================",end:"-- ===================== Tables ( end ) ======================"},{name:"relations",start:"-- ===================== Relations (start) ======================",end:"-- ===================== Relations ( end ) ======================"},{name:"functions",start:"-- ===================== Functions (start) ======================",end:"-- ===================== Functions ( end ) ======================"},{name:"procedures",start:"-- ===================== SPROCs (start) ======================",end:"-- ===================== SPROCs ( end ) ======================"},{name:"views",start:"-- ===================== Views (start) ======================",end:"-- ===================== Views ( end ) ======================"},{name:"indexes",start:"-- ===================== Indexes (start) ======================",end:"-- ===================== Indexes ( end ) ======================"},{name:"triggers",start:"-- ===================== Triggers (start) ======================",end:"-- ===================== Triggers ( end ) ======================"}],a=e=>e.trim().split("/").pop().replace(/^dbo\./i,"");return s.forEach((n=>{if(!t.includes(n.start)||!t.includes(n.end))throw new Error(`Error: Section '${n.name}' not found.`);if(innerContent=t.split(n.start)[1].split(n.end)[0].trim(),innerContent.length>0&&(e.hasContent=!0,"Custom-Start"!=n.name&&"Custom-End"!=n.name)&&innerContent.split("\n").forEach((t=>{const s=t.trim(),r=a(s);e.deletedFiles.some((e=>a(e)===r))||e.tempSections[n.name].includes(s)||e.tempSections[n.name].push(s)})),e.deletedFiles&&e.deletedFiles.length>0&&e.deletedFiles.forEach((e=>{const n=a(e);t=t.replace(new RegExp(`.*${n}.*\\n?`,"g"),"")})),e.newContent&&e.newContent.length>0){const a=e.newContent.filter((e=>e.includes(n.name))),r=e.newContent.filter((e=>!s.some((n=>e.includes(n.name)))));if(a.length>0){const e=`${innerContent}\n${a.join("\n")}`.trim();t=t.replace(`${n.start}\n${innerContent}\n${n.end}`,`${n.start}\n${e}\n${n.end}`),innerContent=e}if("Custom-Start"===n.name&&r.length>0){const e=`${innerContent}\n${r.join("\n")}`.trim();t=t.replace(`${n.start}\n${innerContent}\n${n.end}`,`${n.start}\n${e}\n${n.end}`),innerContent=e}}})),n.writeFileSync(e.changesetFilePath,t,"utf-8"),e.tempSections}}}(),{isValidScriptFile:l}=J?W:(J=1,W={isValidScriptFile:function(e){if(!e.file.startsWith(e.config.paths.scriptsFolderName))return!1;if(!e.file.toLowerCase().endsWith(".sql"))return!1;const n=e.file.split("/");if(!n.length)return!1;if(n.length<2)return!1;const t=n[1].toLowerCase();return!!Object.values(e.config.folders).map((e=>e.toLowerCase())).some((e=>t.startsWith(e)))}}),{categorizeFiles:u}=function(){if(K)return z;K=1;const e=n;return z={categorizeFiles:function({filteredFiles:n,tempSections:t,config:s,folders:a}){return n.forEach((n=>{let r=e.basename(n);r.toLowerCase().startsWith("dbo.")&&(r=r.substring(4));for(const[e,o]of Object.entries(a))if(n.includes(`${s.paths.scriptsFolderName}/${o}/`)){if(!t[e].includes(r))return void t[e].push(r);s.options.debugMode&&console.warn(`File '${r}' already exists in section '${e}'.`)}})),t}}}(),{generateChangesetContent:d}=X?Q:(X=1,Q={generateChangesetContent:function(e,n){return`\n    -- ===================== Custom-Start (start) ======================\n    ${n||""}\n    -- ===================== Custom-Start ( end ) ======================\n    \n    -- ===================== Types (start) ======================\n    ${e.types.join("\n")}\n    -- ===================== Types ( end ) ======================\n    \n    -- ===================== Tables (start) ======================\n    ${e.tables.join("\n")}\n    -- ===================== Tables ( end ) ======================\n    \n    -- ===================== Relations (start) ======================\n    ${e.relations.join("\n")}\n    -- ===================== Relations ( end ) ======================\n    \n    -- ===================== Functions (start) ======================\n    ${e.functions.join("\n")}\n    -- ===================== Functions ( end ) ======================\n    \n    -- ===================== SPROCs (start) ======================\n    ${e.procedures.join("\n")}\n    -- ===================== SPROCs ( end ) ======================\n    \n    -- ===================== Views (start) ======================\n    ${e.views.join("\n")}\n    -- ===================== Views ( end ) ======================\n    \n    -- ===================== Indexes (start) ======================\n    ${e.indexes.join("\n")}\n    -- ===================== Indexes ( end ) ======================\n    \n    -- ===================== Triggers (start) ======================\n    ${e.triggers.join("\n")}\n    -- ===================== Triggers ( end ) ======================\n\n    -- ===================== Custom-End (start) ======================\n    -- ===================== Custom-End ( end ) ======================\n    `}}),{getAppVersion:p}=function(){if(ee)return Z;ee=1;const{Timestamper:e}=c;return Z={getAppVersion:function(n){const t=`create or alter proc ${n.appVersionSprocName} as select '{ts}'`,s=e({locale:`${n.paths.timestampLocale}`,template:`${t}`,format:`${n.paths.appVersionFormat}`,skipOutput:!0});return s.success||(console.warn("ts not generated successfully."),console.warn(`${JSON.stringfy(s.err)}`)),s.data}}}(),{getChangesetFile:f}=function(){if(te)return ne;te=1;const e=t;return ne={getChangesetFile:async function(n,t,s){const a=e(),r=(await a.diff(["--name-only",n,"origin/"+t])).split("\n").find((e=>e.includes(s.replace("-","_"))));if(r){const e=r.lastIndexOf("/"),n=r.substring(e+1);return console.log(`Found changeset file: ${n}`),n}console.log(`No changeset file found for branch '${s}'`)}}}(),{getDropScripts:g}=ae?se:(ae=1,se={getDropScripts:function(e,n){const t={[n.Procedures]:"PROCEDURE",[n.Functions]:"FUNCTION",[n.Tables]:"TABLE",[n.Relations]:"FOREIGN KEY",[n.Types]:"TYPE",[n.Views]:"VIEW",[n.Indexes]:"INDEX",[n.Triggers]:"TRIGGER",[n.Schemas]:"SCHEMA"};return e.map((e=>{const n=e.split("/"),s=n[1],a=n.slice(n.length-1).join(".").replace(".sql",""),r=t[s];return r?((e,n)=>{switch(e){case"PROCEDURE":case"FUNCTION":return`IF OBJECT_ID(N'${n}', N'${e[0]}') IS NOT NULL\nDROP ${e} ${n};\nGO`;case"TABLE":return`/*Note: Drop Table\nIF OBJECT_ID(N'${n}', N'U') IS NOT NULL\nDROP TABLE ${n};\nGO*/`;case"FOREIGN KEY":return`/*Note: Drop the FOREIGN KEY from its table\nALTER TABLE table_name DROP CONSTRAINT ${n};\nGO*/`;case"TYPE":return`IF EXISTS (SELECT 1 FROM sys.types WHERE name = '${n}')\nDROP TYPE ${n};\nGO`;case"VIEW":return`IF OBJECT_ID(N'${n}', N'V') IS NOT NULL\nDROP VIEW ${n};\nGO`;case"INDEX":return`/*Note: Drop the index from its table\nDROP INDEX ${n} ON table_name;\nGO*/`;case"TRIGGER":return`IF OBJECT_ID(N'${n}', N'TR') IS NOT NULL\nDROP TRIGGER ${n};\nGO`;case"SCHEMA":return`IF EXISTS (SELECT 1 FROM sys.schemas WHERE name = '${n}')\nDROP SCHEMA ${n};\nGO`;default:return null}})(r,a):null})).filter((e=>e)).join("\n")}}),{getUserChoice:m}=Re(),{generateFile:h}=function(){if(pe)return de;pe=1;const s=t,a=e,r=n,{extractDateFromString:o}=Oe(),{promptUser:i}=Ae();return de={generateFile:async function(e,n,t){const c=s();let l;const u="\n-- ===================== Custom-Start (start) ======================\n-- ===================== Custom-Start ( end ) ======================\n\n-- ===================== Types (start) ======================\n-- ===================== Types ( end ) ======================\n\n-- ===================== Tables (start) ======================\n-- ===================== Tables ( end ) ======================\n\n-- ===================== Relations (start) ======================\n-- ===================== Relations ( end ) ======================\n\n-- ===================== Functions (start) ======================\n-- ===================== Functions ( end ) ======================\n\n-- ===================== SPROCs (start) ======================\n-- ===================== SPROCs ( end ) ======================\n\n-- ===================== Views (start) ======================\n-- ===================== Views ( end ) ======================\n\n-- ===================== Indexes (start) ======================\n-- ===================== Indexes ( end ) ======================\n\n-- ===================== Triggers (start) ======================\n-- ===================== Triggers ( end ) ======================\n\n-- ===================== Custom-End (start) ======================\n-- ===================== Custom-End ( end ) ======================\n    ";try{const s=(await c.branch()).current.replace("/","_"),d=a.readdirSync(e);let p,f=!1;for(const n of d)if(n.includes(s)){if(f=!0,p=n,console.warn(`Changeset file already exists in ${e}${p}`),d.some((e=>o(t,e)>o(t,n))))for(;;){if(console.warn("The changeset you want to modify is followed by other changesets."),l=await i("Modifying this file might cause issues during execution later. Are you sure you want to change this file (Y/N)? "),"y"===l.toLowerCase()){l=!0;break}if("n"===l.toLowerCase())throw l=!1,"Operation canceled.";console.log("Invalid choice. Please enter a valid option.")}break}return f||(p=`${n}_${s}.txt`,a.writeFileSync(r.join(e,p),u.trim())),p}catch(e){throw new Error(e)}}}}(),{getModifiedAndUntrackedFiles:b}=function(){if(ge)return fe;ge=1;const{execSync:e}=s;return fe={getModifiedAndUntrackedFiles:function({debug:n,currentBranch:t}){try{const s=e("git merge-base HEAD origin/dev",{encoding:"utf-8"}).trim();n&&(console.log(`Current Branch: ${t}`),console.log(`Merge Base: ${s}`));const a=e(`git diff --name-only --diff-filter=MA ${s} HEAD`,{encoding:"utf-8"}).split("\n").map((e=>e.trim())).filter((e=>e)),r=e(`git diff --name-only --diff-filter=AM ${s} HEAD`,{encoding:"utf-8"}).split("\n").map((e=>e.trim())).filter((e=>e)),o=e(`git diff --name-only --diff-filter=D ${s} HEAD`,{encoding:"utf-8"}).split("\n").map((e=>e.trim())).filter((e=>e));return[...a,...r,...o]}catch(e){throw new Error(`Error fetching modified and untracked files: ${e.message}`)}}}}(),{restoreCommitedChanges:w}=Ie(),y=t(),S=e,C=n,{getAllChangesetFiles:E}=ke();let F,$,N={procedures:[],functions:[],tables:[],relations:[],types:[],views:[],indexes:[],triggers:[],schemas:[]};const T="TempBackupDB";return be={run:async function(e,n){try{if(e.options.runOnPipline||e.options.runAllChangesets){if(e.options.runOnPipline&&!e.options.runAllChangesets){const t=await f(n.masterBranchName,n.realBranchName,n.currentBranch);if(!t)return;{const s=C.join(n.changesetPath,`${t}`);await r({tempScript:s,temptxtfile:"",scriptFile:"",txtFile:"",changesetPath:n.changesetPath,runOnPipline:e.options.runOnPipline,backupFile:n.backupFile,backupDbName:T,config:e,userChoice:F,folders:e.folders,changesetsTableName:e.paths.changesetsTableName,now:n.now})}}if(e.options.runAllChangesets){const t=await E(e,n.now);if(e.options.debugMode&&console.log("allChangesetsScriptFilePath:",t.allChangesetsScriptFilePath),!t?.allChangesetsScriptFilePath)return;await r({tempScript:t.allChangesetsScriptFilePath,temptxtfile:"",scriptFile:"",txtFile:"",changesetPath:n.changesetPath,runAllChangesets:e.options.runAllChangesets,backupFile:n.backupFile,backupDbName:T,config:e,userChoice:F,folders:e.folders,now:n.now,pendingChangesets:t.pendingChangesets,changesetsTableName:e.paths.changesetsTableName})}}else{const t=await y.status();F=await m(t,e.folders,e),void 0===F&&process.exit(1),e.changesetFile||(e.changesetFile=await h(n.changesetPath,n.now,e));const s=C.parse(e.changesetFile).name,c=`${C.parse(e.changesetFile).name}~`,f=`${C.parse(e.changesetFile).name}~.txt`,E=C.join(n.changesetPath,`${s}.txt`),x=C.join(n.changesetPath,f),O=C.join(n.changesetPath,`${s}~.sql`),I=C.join(n.changesetPath,`${s}.sql`);if(!S.existsSync(E))throw"2"===F&&w(),new Error("Error: file not found!");{const s=[];t.deleted.length>0&&o({status:t.deleted,listName:s,commit:!1,folder:e.folders,config:e}),N=i({changesetFilePath:E,newContent:null,deletedFiles:s,hasContent:undefined,tempSections:N});const f=b({debug:e.options.debugMode,currentBranch:n.currentBranch}).filter((n=>l({config:e,file:n})));e.options.debugMode&&(console.log("Filtered Modified Files:",f),console.log("Filtered Deleted Files:",s)),0===f.length&&0==s.length&&(console.log("No relevant modified files found."),"2"===F&&w(),process.exit(0));const m=u({filteredFiles:f,tempSections:N,config:e,folders:e.folders});if(s.length>0){const n=g(s,e.folders);$=d(m,n)}else $=d(m);S.writeFileSync(x,$.trim(),"utf-8"),console.log(`Changeset written to ${E}`);const h=a({config:e,tempFileName:c})+`\ngo\n${p(e)}\ngo\n            `;S.writeFileSync(O,h,"utf-8"),e.options.debugMode&&console.log(`Script written to: ${O}`),await r({tempScript:O,temptxtfile:x,scriptFile:I,txtFile:E,changesetPath:n.changesetPath,runOnPipline:e.options.runOnPipline,backupFile:n.backupFile,backupDbName:T,config:e,userChoice:F,folders:e.folders})}}}catch(n){throw e.options.runOnPipline||e.options.runAllChangesets||"2"==F&&w(),e.options.debugMode?new Error(n):new Error(n.message)}}}}function Me(){if(Se)return ye;Se=1;const s=e,a=n,r=t,{promptUser:o}=Ae();let i;function c(e,n,t,r,o){const i=a.join(t,e);s.existsSync(i)||(s.writeFileSync(i,n,"utf8"),console.log(`Created file: ${e}`)),r&&(o.add(i),o.commit("Auto-Commit: initialized files and folders."))}return ye={createDefaultFolders:async function(e){try{const n=r(),t=await n.checkIsRepo();t||(i=await async function(e){for(;;){if(i=await o("Would you like to initialize a git repository(Y/N)? "),"y"===i.toLowerCase()){try{await e.init(),console.log("Git repository initialized successfully.")}catch(e){throw new Error(`Error during initializing git repository: ${e.message}`)}break}if("n"===i.toLowerCase())break;console.log("Invalid choice. Please enter a valid option.")}return i}(n));["Changes","Data","Scripts/Schemas","Scripts/Types","Scripts/Tables","Scripts/Functions","Scripts/Triggers","Scripts/Views","Scripts/Procedures","Scripts/Relations","Scripts/Indexes"].forEach((n=>{const t=a.join(e.basePath,n);s.existsSync(t)||(s.mkdirSync(t,{recursive:!0}),console.log(`Created folder: ${n}`))})),c(".gitlab-ci.yml",'stages:\n  - build\n\nvariables:\n  GIT_DEPTH: 0\n\nbefore_merge_build:\n  stage: build\n  image: node:alpine\n  script:\n    - echo "Installing dependencies..."\n    - npm i @puya/pdcsc -g\n    - apk update && apk add git\n    - pdcsc -rop\n  rules:\n    - when: manual',e.basePath),c("pdcsc-config.json",function(e){const n={database:{server:"",user:"",password:"",databaseName:""}};e.options.initfull&&(n.pipeline="gitlabs",n.paths={backupDir:"C:\\temp\\",changesetFolderName:"Changes",scriptsFolderName:"Scripts",appVersionFormat:"YYYY-MM-DD HH:mm:ss",timestampLocale:"en",masterBranchName:"origin/dev",changesetsTableName:"Changesets"},n.folders={Procedures:"Procedures",Functions:"Functions",Tables:"Tables",Relations:"Relations",Types:"Types",Views:"Views",Indexes:"Indexes",Triggers:"Triggers",Schemas:"Schemas"},n.appVersionSprocName="dbo.getAppVersion");return JSON.stringify(n,null,4)}(e),e.basePath),t||"y"!==i.toLowerCase()||c(".gitignore","# SQL Server files\n*.mdf\n*.ldf\n*.ndf\n\n# User-specific files\n*.rsuser\n*.suo\n*.user\n*.userosscache\n*.sln.docstates\n\n# User-specific files (MonoDevelop/Xamarin Studio)\n*.userprefs\n\n# Visual Studio cache files\n.vs/\n\n# Node.js\nnode_modules/\n\n# Dist and publish\n/dist\n/publish\n\n# NuGet Packages\n*.nupkg\n**/[Pp]ackages/*\n!**/[Pp]ackages/build/\n\n# Microsoft Azure\ncsx/\n*.build.csdef\n\n# Generated scripts\n/Scripts/Indexes.sql\n/Scripts/Relations.sql\n/Scripts/Schemas.sql\n/Scripts/Types.sql\n/Scripts/Tables.sql\n/Scripts/Triggers.sql\n/Scripts/Procedures.sql\n/Scripts/Functions.sql\n/Scripts/Views.sql\n/Scripts/ViewsAndFunctions.sql\n\n# Logs and backups\n/Changes/error.log",e.basePath,!0,n)}catch(e){throw new Error(e.message)}}}}var Le=function(){if(Ce)return w;Ce=1;const{validateCommandLineArgs:t}=function(){if(f)return p;f=1;const t=e,s=n;return p={validateCommandLineArgs:async function(){let e,n,a,r,o,i,c,l;const u=process.cwd(),d=process.argv.slice(2),p=!!d.includes("-rop"),f=!!d.includes("-ud"),g=!!d.includes("-dbm"),m=!!d.includes("-v"),h=!!d.includes("-init"),b=!!d.includes("-initfull"),w=d.indexOf("-csf");-1!==w&&d[w+1]&&(n=d[w+1]);const y=d.indexOf("-cht");-1!==y&&d[y+1]&&(a=d[y+1],o.changesetsTableName=a);const S=d.indexOf("-s");-1!==S&&d[S+1]&&(r=d[S+1]);const C=d.indexOf("-u");-1!==C&&d[C+1]&&(i=d[C+1]);const E=d.indexOf("-p");-1!==E&&d[E+1]&&(c=d[E+1]);const F=d.indexOf("-d");-1!==F&&d[F+1]&&(l=d[F+1]);const $=d.indexOf("-c");if(-1!==$&&d[$+1]){if(e=s.join(u,d[$+1]),!t.existsSync(e))throw`config file ${e} not found.`}else e=s.join(u,"pdcsc-config.json");o=t.existsSync(e)?JSON.parse(t.readFileSync(e,"utf-8")):{};const N={configPath:e,changesetFile:n,basePath:u},T={databaseName:l||o.database?.databaseName,server:r||o.database?.server,user:i||o.database?.user,password:c||o.database?.password};return{...o,options:{runOnPipline:p,runAllChangesets:f,version:m,debugMode:g,init:h,initfull:b},database:T,...N}}},p}(),{initialize:s}=Fe(),{run:a}=ve(),r=Ee,{createDefaultFolders:o}=Me();let i;return async function(){if(i=await t(),i.options.version){const e=r.version;console.log("PDCSC Version: ",e)}else if(i.options.init||i.options.initfull)o(i);else{const e=await s(i);await a(i,e)}}().catch((e=>{i.options.debugMode?console.error(e):console.error(e.message),process.exit(1)})),w}(),je=d(Le);module.exports=je;
