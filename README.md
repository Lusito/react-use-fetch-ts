# react-use-fetch-ts

[![Minified + gzipped size](https://badgen.net/bundlephobia/minzip/react-use-fetch-ts)](https://www.npmjs.com/package/react-use-fetch-ts)
[![NPM version](https://badgen.net/npm/v/react-use-fetch-ts)](https://www.npmjs.com/package/react-use-fetch-ts)
[![License](https://badgen.net/github/license/lusito/react-use-fetch-ts)](https://github.com/lusito/react-use-fetch-ts/blob/master/LICENSE)
[![Stars](https://badgen.net/github/stars/lusito/react-use-fetch-ts)](https://github.com/lusito/react-use-fetch-ts)
[![Watchers](https://badgen.net/github/watchers/lusito/react-use-fetch-ts)](https://github.com/lusito/react-use-fetch-ts)

Lightweight fetching hooks for react, written in TypeScript.

#### Why use this hook creator?

- Very lightweight (see the badges above for the latest size).
- Flexible and dead simple to use.
- Written in TypeScript
- Only has one required peer dependency: React 16.8.0 or higher.
- Liberal license: [zlib/libpng](https://github.com/Lusito/react-use-fetch-ts/blob/master/LICENSE)

**Beware**: This is currently work in progress. The API might change.
Also, the readme has been hacked together quickly. If something is unclear, either raise an issue or dig into the source-code.

There are a lot of similar hooks out there, but they either lacked something I needed or seemed overly complicated to use.

### Installation via NPM

```npm i react-use-fetch-ts```

This library is shipped as es2017 modules. To use them in browsers, you'll have to transpile them using webpack or similar, which you probably already do.

### Examples

#### A simple get

Let's say you have a user object you want to fetch. First you'll create a custom hook to perform the fetch:

```tsx
import { createFetchHook, prepareGet } from "react-use-fetch-ts";

export const useGetUser = createFetchHook({
    prepare: (init: FetchRequestInit, data: { id: number }) => {
        prepareGet(init);
        return `api/user${data.id}`
    },
    getResult: (response: Response) => response.json() as Promise<UserDTO>,
    getError: (response: Response) => response.json() as Promise<RestValidationErrorDTO>
});
```

- `createFetchHook` creates a hook for you. See further below for more details.
- `prepareGet` is a helper to prepare the init object for a GET request. See further below for more details.

Now you can start using your new `useGetUser` hook:

```tsx
import { useGetUser } from "./fetch/user";

function UserComponent(props: { id: number }) {
    const [getUser] = useGetUser({ autoSubmit: { id: props.id });

    if (getUser.failed) return <div>Error fetching user</div>;
    if (!getUser.success) return <div>Loading..</div>;

    const user = getUser.data;

    return <div>{user.name}</div>;
}
```

- `useGetUser` can take an optional config object. See further below for details.
- The hook returns an array containing 3 items (see further below for the other items):
  - The first entry is the current state of the fetch request, containing the result or error data when it's done. See further below for more details.


#### A PUT request

Let's say you have a form to submit updates on a user object.

Again, we'll need to create an initializer object. This time it will take a FormData object in addition to the id.

```tsx
import { setupFetch, preparePost } from "react-use-fetch-ts";

export const useUpdateUser = createFetchHook({
    prepare: (init: FetchRequestInit, data: { id: number, formData: FormData }) => {
        prepareFormDataPost(init, data.formData);
        init.method = "PUT";
        return `api/user${data.id}`;
    },
    getResult: (response: Response) => response.json() as Promise<boolean>,
    getError: (response: Response) => response.json() as Promise<RestValidationErrorDTO>
});
```

- `prepareFormDataPost` is a helper method, which will prepare the init object with a FormData object. See further below for more details.
- Additionally, since `prepareFormDataPost` sets the property `method` to "POST", we override this here with a "PUT".
- In this case, we expect the server to return `true` on success, so the result type is `boolean`.
- Aside from that there is nothing special going on here.

```tsx

interface ErrorMessageForStateProps {
    state: FetchState<any, RestValidationErrorDTO>;
}

export const ErrorMessageForState = ({ state }: ErrorMessageForStateProps) => {
    switch (state.state) {
        case "error":
            return <div>Error {state.error.error}</div>;
        case "exception":
            return <div>Error {state.error.message}</div>;
        default:
            return null;
    }
};

export const getValidationErrors = (state: FetchState<any, RestValidationErrorDTO>) =>
    (state.state === "error" && state.error.validation_errors) || {};


function EditUserComponent(props: { id: number }) {
    const [getUser] = useGetUser({ autoSubmit: { id: props.id } });
    const [updateUser, submitUpdateUser] = useUpdateUserFetch();

    if (getUser.failed) return <div>Error fetching user</div>;
    if (!getUser.success) return <div>Loading..</div>;

    const user = getUser.data;
    const validationErrors = getValidationErrors(updateUser);

    return (
        <Form
            onSubmit={(e) => submitUpdateUser({ id: props.id, formData: new FormData(e.currentTarget) })}
            loading={updateUser.loading}
        >
            <Input
                name="name"
                label="Name"
                placeholder="Name"
                error={validationErrors.name}
                defaultValue={user.name}
            />
            ...
            <ErrorMessageForState state={updateUser} />
            <button type="submit">Save</button>
        </Form>
    );
}
```

There's a lot more going on here:

- In addition to getting the user, which we already did in the first example,
- We're also using the `useUpdateUserFetch` hook. No `autoSubmit` config means we need to call it manually.
  - The second entry in the returned array is a submit function, which you can call to manually (re-)submit the request.
- We're getting a validation hashmap from the errorResult in case there has been a server-side error. The server obviously needs to supply this.
- We're using some pseudo UI library to define our user form:
  - onSubmit is passed on to the `<form>` element, so we get notified of submits.
    - On submit, we create a new FormData object from the `<form>` element.
    - The biggest advantage of this is that you don't need to connect all of your input elements to your components state.
  - When an error happened, we try to show some information about it. See further below for more information on the state values.

#### Callback functions

If you want to act upon success/error/exception when they happen, you can do it like this:
```tsx
function UserComponent(props: { id: number }) {
    const [getUser] = useGetUser({
        onSuccess(result: UserDTO, status: number, responseHeaders: Headers) {
            console.log('success', result, status, responseHeaders);
        },
        onError(errorResult: TError, status: number, responseHeaders: Headers) {
            console.log('error', errorResult, status, responseHeaders);
        },
        onException(error: Error) {
            console.log('exception', error);
        },
        autoSubmit: { id: data.id },
    });
    // ...
}
```

### API

#### createFetchHook

- `createFetchHook` creates a type-safe hook that you can use to perform the fetch.
- it takes an object with 3 attributes:
  - `prepare` is a function used to prepare the init object you would pass to a fetch call.
    - the first parameter is the init object you can modify.
    - its (optional) second parameter can be an object of your liking
    - the return value should be the URL you want to run this fetch against.
  - `getResult` is a function called to get the result of a response to a type-safe version. Always add a `as Promise<MyType>` at the end to define your type.
  - `getError` is essentially the same, but for the case where `response.ok === false`. I.e. you can have a different type for non-ok responses.


#### Your Custom Hook

- The hook created by `createFetchHook` can an optional config parameter with these optional properties:
  - One or more of these callbacks: `onInit`, `onSuccess`, `onError`, `onException`
  - A parameter autoSubmit, which can be used to automatically submit the request on component mount
    - Set this to true if your `prepare` function does not take a data parameter
    - Or set this to the data object your `prepare` function will receive
- `useFetch` returns an array containing 3 items:
  - The first entry is the current state of the fetch request, containing the result or error data when it's done. See below for more details.
  - The second entry is a submit function, which you can call to manually (re-)submit the request.
  - The third entry is an abort function to cancel the active request.

#### FetchState

The first entry of the array returned by your custom hook is a state object. Depending on the state's status, it can have different properties:

```tsx
export interface FetchStateBase {
    /** Request is currently in progress */
    loading: boolean;
    /** Either an exception occurred or the request returned an error */
    failed: boolean;
    /** Request was successful */
    success: boolean;
}

export interface FetchStateEmpty extends FetchStateBase {
    state: "empty";
    failed: false;
    success: false;
}

export interface FetchStateDone extends FetchStateBase {
    /** The status code of the response */
    responseStatus: number;
    /** The headers of the response */
    responseHeaders: Headers;
}

export interface FetchStateDoneSuccess<TData> extends FetchStateDone {
    failed: false;
    success: true;
    /** Data is present */
    state: "success";
    /** The response data in case of success */
    data: TData;
}

export interface FetchStateDoneError<TError extends Record<string, any>> extends FetchStateDone {
    failed: true;
    success: false;
    /** Errors is present */
    state: "error";
    /** The server result data. */
    error: TError;
}

export interface FetchStateDoneException extends FetchStateBase {
    failed: true;
    success: false;
    /** Errors is present */
    state: "exception";
    /** The cause of the exception. */
    error: Error;
}

export type FetchState<TData, TError extends Record<string, any>> =
    | FetchStateEmpty
    | FetchStateDoneSuccess<TData>
    | FetchStateDoneError<TError>
    | FetchStateDoneException;
```

As you can see, you will only be able to access `state.data` if you checked for `state.success` or `state.state === "success"` (or if you ruled out the other possibilities first)

#### Helper Functions

The following functions will initialize the `RequestInit` object for specific use-cases.
They will all set`credentials` `"include"` and a header `Accept` with value `"application/json"`

- `prepareGet` prepares a GET request
- `preparePost` prepares a form-data POST request.
- `preparePostUrlEncoded` prepares a form url-encoded POST request
- `prepareFormDataPost` prepares a POST request with a `FormData` object and detects if it contains files.
  - if it contains files, it will call `preparePost` and set the body to the formData object.
  - otherwise `preparePostUrlEncoded` will be called and the properties of the formData will be set accordingly.

### Report issues

Something not working quite as expected? Do you need a feature that has not been implemented yet? Check the [issue tracker](https://github.com/Lusito/react-use-fetch-ts/issues) and add a new one if your problem is not already listed. Please try to provide a detailed description of your problem, including the steps to reproduce it.

### Contribute

Awesome! If you would like to contribute with a new feature or submit a bugfix, fork this repo and send a pull request. Please, make sure all the unit tests are passing before submitting and add new ones in case you introduced new features.

### License

react-use-fetch-ts has been released under the [zlib/libpng](https://github.com/Lusito/react-use-fetch-ts/blob/master/LICENSE) license, meaning you
can use it free of charge, without strings attached in commercial and non-commercial projects. Credits are appreciated but not mandatory.
