import { useState, useCallback, useRef, useLayoutEffect } from "react";

export * from "./defaults";

export interface FetchState<TError, TResult> {
    /** Request is currently in progress */
    loading?: boolean;
    /** Request has finished successfully and the result is stored in the result attribute */
    success?: boolean;
    /** Request has finished with either an error or an exception. */
    error?: boolean;
    /** The status code of the response (if no exception has been thrown) */
    responseStatus?: number;
    /** The headers of the response (if no exception has been thrown) */
    responseHeaders?: Headers;
    /** The response of the server as JSON in case of success */
    result?: TResult;
    /** The response of the server as JSON in case of error */
    errorResult?: TError;
    /** If an exception has been thrown, this will contain the error */
    cause?: Error;
}

export type FetchParams = Parameters<typeof fetch>;
export type SetState<TError, TResult> = (state: FetchState<TError, TResult>) => void;

export interface FetchConfig<TResult, TError, TPrepare extends (...args: any[]) => FetchParams> {
    prepare: TPrepare;
    getResult: (json: any) => TResult;
    getError: (json: any) => TError;
    onSuccess?(result: TResult, status: number, responseHeaders: Headers): void;
    onError?(errorResult: TError, status: number, responseHeaders: Headers): void;
    onException?(error: Error): void;
}

export function fetchConfig<TResult, TError, TPrepare extends (...args: any[]) => FetchParams>(
    base: FetchConfig<TResult, TError, TPrepare>
) {
    return base;
}

/** A hook to create a reference and always set it to the new value. Used to avoid a fresh render on change */
export function useAndSetRef<T>(value: T) {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}

export function useFetch<TResult, TError, TPrepare extends (...args: any[]) => FetchParams>(
    _config: FetchConfig<TResult, TError, TPrepare>,
    params?: Parameters<TPrepare>
) {
    const latestConfig = useAndSetRef(_config);
    const [state, setStateUnsafe] = useState<FetchState<TError, TResult>>({ loading: !!params });
    const mounted = useRef(true);
    const setState = useCallback((newState: FetchState<TError, TResult>) => {
        mounted.current && setStateUnsafe(newState);
    }, []);
    const controller = useRef<AbortController>();
    const abort = useCallback(() => {
        if (controller.current) {
            controller.current.abort();
            controller.current = undefined;
            setState({});
        }
    }, []);
    const submit = useCallback(async (...args: Parameters<TPrepare>) => {
        const config = latestConfig.current;
        let responseStatus = -1;
        try {
            abort();
            controller.current = new AbortController();
            setState({ loading: true });
            const [input, init] = config.prepare(...args);
            const response = await fetch(input, { ...init, signal: controller.current.signal });

            responseStatus = response.status;

            if (response.ok) {
                const result: TResult = config.getResult(await response.json());
                if (config.onSuccess) config.onSuccess(result, responseStatus, response.headers);
                setState({ success: true, responseStatus: response.status, responseHeaders: response.headers, result });
            } else {
                const errorResult: TError = config.getError(await response.json());
                if (config.onError) config.onError(errorResult, responseStatus, response.headers);
                setState({ error: true, responseStatus: response.status, responseHeaders: response.headers, errorResult });
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                console.log(error);
                if (config.onException) config.onException(error);
                setState({ responseStatus, error: true, cause: error });
            }
        }
    }, []);
    useLayoutEffect(() => {
        mounted.current = true;
        params && submit(...params);
        return () => {
            mounted.current = false;
            abort();
        };
    }, []);
    return [state, submit, abort] as const;
}
