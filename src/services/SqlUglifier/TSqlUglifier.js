import BaseSqlUglifier from "./BaseSqlUglifier";

class TSqlUglifier extends BaseSqlUglifier {
    uglify(query) {
        return query;
    }
}

export default TSqlUglifier;