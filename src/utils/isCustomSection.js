function isCustomEndSection(section) {
    return section == "customEnd";
}

function isCustomStartSection(section) {
    return section == "customStart";
}

function isCustomSection(section) {
    return isCustomStartSection(section) || isCustomEndSection(section);
}

function isSectionEnd(section, line) {
    return (!isCustomEndSection(section) && line && line.contains("end")) || /\(\s*end\s*\)/.test(line)
}

export { isCustomStartSection, isCustomEndSection, isCustomSection, isSectionEnd };