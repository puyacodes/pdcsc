import init from "./init";
import read from "./read";
import validate from "./validate";

async function getConfig(args) {
    const config = await read(args);

    validate(config);
    
    await init(config);
    
    return config;
}

export default getConfig;