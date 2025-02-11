function extractDateFromString(config, inputString) {
    try {
        let date;
        const regex = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/;
        const match = inputString.match(regex);

        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const day = parseInt(match[3], 10);
            const hour = parseInt(match[4], 10);
            const minute = parseInt(match[5], 10);
            const second = match[6] ? parseInt(match[6], 10) : 0;

            date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
            const formattedDate = date.toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '');

            if (config.options.debugMode) {
                console.log("Extracted Date:", formattedDate);
            }

            return formattedDate;
        } else {
            throw new Error("No date found in the input string.");
        }
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = { extractDateFromString }