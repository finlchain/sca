const cluster = require("./src/Cluster.js");

const main = async () => {
    await cluster.ClusterInit();
}

main();