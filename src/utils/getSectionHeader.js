import getSectionMarker from "./getSectionMarker";

function getSectionHeader(section, header, type = "txt") {
    const title = getSectionMarker(section);
    const space = ' '.repeat(parseInt((14 - title.length) / 2));
    const oneSpace = (14 - title.length) % 2 == 0 ? '': ' ';

    const result = header || ((type == "sql" ? "--": "##") + ` ===================== ${oneSpace}${space}${title}${space} ======================`);

    return result;
}

export default getSectionHeader;