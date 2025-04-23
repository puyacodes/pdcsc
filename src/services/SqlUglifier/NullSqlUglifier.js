import BaseSqlUglifier from "./BaseSqlUglifier";

class NullSqlUglifier extends BaseSqlUglifier {
    uglify(query) {
        return query;
    }
}

export default NullSqlUglifier;