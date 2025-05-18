function isCustomEndSection(section) {
    return section == "customEnd";
}

function isCustomStartSection(section) {
    return section == "customStart";
}

function isCustomSection(section) {
    return isCustomStartSection(section) || isCustomEndSection(section);
}

export { isCustomStartSection, isCustomEndSection, isCustomSection };