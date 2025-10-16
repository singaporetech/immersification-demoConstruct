    /**
    * This can convert other functions into pesudo promise functions by taking them in as parameters.
    */
    export class FunctionUtiliy
    {
        static promisify(func, ...args)
        {
            return new Promise((resolve) => {
                const result = func(...args);
                resolve(result);
            });
        }
    }