import { Exception } from "@locustjs/exception";

//Todo: Done
// no need to convert timestamp to a javascript Date

function extractDateFromString(config, inputString) {

    config.debug2(`extracting date from: ${inputString}`)

    try {
        const regex = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/;
        const match = inputString.match(regex);

        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const day = parseInt(match[3], 10);
            const hour = parseInt(match[4], 10);
            const minute = parseInt(match[5], 10);
            const second = match[6] ? parseInt(match[6], 10) : 0;

            config.debug3({ year, month, day, hour, minute, second })

            //const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

            const formattedDate = match[0]; // formattedDate = date.toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '');

            return formattedDate;
        }
    } catch (ex) {
        throw new Exception("Extracting date error", ex);
    }
}

export default extractDateFromString;