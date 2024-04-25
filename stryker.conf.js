module.exports = {
    packageManager: "npm",
    reporters: ["html", "clear-text", "progress"],
    testRunner: "mocha",
    mochaOptions: {
        spec: ["test/unit/**/*.js"]
    },
    coverageAnalysis: "off",
    mutate: ["controllers/**.js"]
};
