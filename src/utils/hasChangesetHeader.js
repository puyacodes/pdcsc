import { isEmpty } from "@locustjs/base";

function hasChangesetHeader(content, type = "txt") {
    if (isEmpty(content)) {
        return false;
    }
    
    if (type == "txt") {
        return /#[^\S\r\n]*\*\*\*[^\S\r\n]*Changeset[^\S\r\n]/.test(content);
    } else {
        return /#[^\S\r\n]*\*\*\*[^\S\r\n]*Changeset[^\S\r\n]/.test(content);
    }
}

export default hasChangesetHeader;