import { isSomeString } from "@locustjs/base";
import BaseSqlMinifier from "./BaseSqlMinifier";

class TSqlMinifier extends BaseSqlMinifier {
    minify(query) {
        let result = "";

        if (isSomeString(query)) {
            const states = {
                main: 0,
                stringStarted: 1,
                isSingleLineComment: 2,
                singleLineComment: 21,
                isMultiLineComment: 3,
                multiLineComment: 31,
                isMultiLineCommentEnding: 32,
                inNewLine: 6,
                inBracket: 7,
                whitespace: 8,
                isGo: 9,
                go: 91
            }
            let ch;
            let lastCh;
            let i = -1;
            let state = states.main;
            let temp = '';

            while (true) {
                if (lastCh) {
                    ch = lastCh;
                    lastCh = undefined;
                } else {
                    ch = query.substr(++i, 1);
                }

                switch (state) {
                    case states.main:
                        switch (ch) {
                            case "'":
                                result += ch;
                                state = states.stringStarted;
                                break;
                            case "-":
                                state = states.isSingleLineComment;
                                break;
                            case "/":
                                state = states.isMultiLineComment;
                                break;
                            case "\n":
                                state = states.inNewLine;
                                break;
                            case " ":
                            case "\t":
                            case "\v":
                                state = states.whitespace;
                                break;
                            case "[":
                                result += ch;
                                state = states.inBracket;
                                break;
                            default:
                                result += ch;
                                break;
                        }

                        break;
                    case states.stringStarted:
                        result += ch;

                        if (ch == "'") {
                            state = states.main;
                        }

                        break;
                    case states.isSingleLineComment:
                        if (ch == "-") {
                            state = states.singleLineComment;
                        } else {
                            result += "-" + ch;
                            state = states.main;
                        }

                        break;
                    case states.singleLineComment:
                        if (ch == "\n") {
                            state = states.main;
                        }
                        break;
                    case states.isMultiLineComment:
                        if (ch == "*") {
                            state = states.multiLineComment;
                        } else {
                            result += "/";
                            lastCh = ch;
                            state = states.main;
                        }

                        break;
                    case states.multiLineComment:
                        if (ch == "*") {
                            state = states.isMultiLineCommentEnding;
                        }
                        break;
                    case states.isMultiLineCommentEnding:
                        if (ch == "/") {
                            state = states.main;
                        } else {
                            lastCh = ch;
                            state = states.multiLineComment;
                        }
                        break;
                    case states.inBracket:
                        result += ch;

                        if (ch == "]") {
                            state = states.main;
                        }
                        break;
                    case states.whitespace:
                        if (ch == "\n") {
                            state = states.inNewLine;
                        } else if (!/\s/.test(ch)) {
                            result += " ";
                            lastCh = ch;
                            state = states.main;
                        }
                        break;
                    case states.inNewLine:
                        if (!/\s/.test(ch)) {
                            if (ch == 'g' || ch == 'G') {
                                temp = ch;
                                state = states.isGo;
                            } else {
                                result += ' ';
                                state = states.main;
                                lastCh = ch;
                            }
                            break;
                        }
                        break;
                    case states.isGo:
                        if (ch == 'o' || ch == 'O') {
                            temp += ch;
                            state = states.go;
                        } else {
                            result += " " + temp;
                            temp = '';
                            state = states.main
                        }
                        break;
                    case states.go:
                        if (/\s/.test(ch)) {
                            result += "\n" + temp + "\n";
                            temp = "";
                        } else {
                            result += " " + temp;
                            temp = "";
                            lastCh = ch;
                        }

                        state = states.main;
                        break;
                }

                if (i >= query.length) {
                    break;
                }
            }
        }

        return result;
    }
}

export default TSqlMinifier;