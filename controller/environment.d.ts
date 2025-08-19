declare global {
    namespace NodeJS {
        interface ProcessEnv {
            AS_URL: string; // declare the type of the AS_URL
        }
    }
}

export {};
