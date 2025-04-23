import BaseSqlObfuscator from "./BaseSqlObfuscator";

class TSqlObfuscator extends BaseSqlObfuscator {
    obfuscate(query) {
        return query;
    }
}

export default TSqlObfuscator;