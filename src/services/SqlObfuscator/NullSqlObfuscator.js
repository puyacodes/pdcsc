import BaseSqlObfuscator from "./BaseSqlObfuscator";

class NullSqlObfuscator extends BaseSqlObfuscator {
    obfuscate(query) {
        return query;
    }
}

export default NullSqlObfuscator;