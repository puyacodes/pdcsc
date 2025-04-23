import BaseSqlMinifier from "./BaseSqlMinifier";

class NullSqlMinifier extends BaseSqlMinifier {
    minify(query) {
        return query;
    }
}

export default NullSqlMinifier;