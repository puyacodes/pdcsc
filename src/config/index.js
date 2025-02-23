import init from "./init";
import process from "./process";
import validate from "./validate";

async function getConfig(args) {
    const config = await process(args);

    validate(config);
    init(config);
    
    return config;
}

export default getConfig;