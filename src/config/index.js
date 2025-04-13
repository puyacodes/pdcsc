import init from "./init";
import read from "./read";
import validate from "./validate";

async function getConfig(args) {
    let error;
    const config = read(args);

    error = validate(config);

    if (!error) {
        init(config);
    }

    return { config, error };
}

export default getConfig;