export default [
    {
        ignores: [
            "docs/**",
            "node_modules/**"
        ]
    },
    {
        files: [
            "web-app/**/*.js",
            "web-app/**/*.mjs"
        ],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                Array: "readonly",
                Date: "readonly",
                Error: "readonly",
                Math: "readonly",
                Number: "readonly",
                Object: "readonly",
                Promise: "readonly",
                RangeError: "readonly",
                String: "readonly",
                TypeError: "readonly",
                console: "readonly",
                describe: "readonly",
                document: "readonly",
                it: "readonly",
                process: "readonly",
                window: "readonly"
            }
        },
        rules: {
            eqeqeq: "error",
            "no-undef": "error",
            "no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_"
                }
            ],
            "no-var": "error",
            "prefer-const": "error"
        }
    }
];
