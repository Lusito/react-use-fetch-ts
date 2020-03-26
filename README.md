# react-use-fetch-ts

[![Minified + gzipped size](https://badgen.net/bundlephobia/minzip/react-use-fetch-ts)](https://www.npmjs.com/package/react-use-fetch-ts)
[![NPM version](https://badgen.net/npm/v/react-use-fetch-ts)](https://www.npmjs.com/package/react-use-fetch-ts)
[![License](https://badgen.net/github/license/lusito/react-use-fetch-ts)](https://github.com/lusito/react-use-fetch-ts/blob/master/LICENSE)
[![Stars](https://badgen.net/github/stars/lusito/react-use-fetch-ts)](https://github.com/lusito/react-use-fetch-ts)
[![Watchers](https://badgen.net/github/watchers/lusito/react-use-fetch-ts)](https://github.com/lusito/react-use-fetch-ts)

A lightweight fetching hook for react, written in TypeScript.

#### Why use this hook?

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

Let's say you have a user object you want to fetch. First you'll need to create a config object.

```tsx
import { initFormPost, fetchConfig } from "react-use-fetch-ts";

export const getUserConfig = fetchConfig({
    prepare: (id: number) => [`api/user${id}`, defaultGetInit],
    getResult: (json: any) => json as UserDTO,
    getError: (json: any) => json as RestValidationErrorDTO
});
```

- `fetchConfig` helps to define the types involved in a request. See further below for more details.
- `defaultGetInit` is a pre-baked object for use in a get request. See further below for more details.

Now you can start using the `useFetch` hook:


```tsx
import { useFetch } from "react-use-fetch-ts";

import { getUserConfig } from "./fetch-configs/user";

function UserComponent(props: { id: number }) {
    const [getUser] = useFetch(getUserConfig, [props.id]);

    if (getUser.error) return <div>Error fetching user</div>;
    if (getUser.loading) return <div>Loading..</div>;

    const user = getUser.result;

    return <div>{user.name}</div>;
}
```

- `useFetch` can take one or two parameters.
  - The first is the config object you specified above.
  - If you specify a second parameter, the fetch will be started instantly without a manual trigger
    - The second parameter is an array containing all the arguments you would pass to the `prepare` function of your config object.
- `useFetch` returns an array containing 3 items:
  - The first entry is the current state of the fetch request, containing the results or error when it's done. See further below for more details.


#### A PUT request

Let's say you have a form to submit updates on a user object.

Again, we'll need to create a config object. This time it will take a FormData object in addition to the id.

```tsx
import { initFormPost, fetchConfig } from "react-use-fetch-ts";

export const updateUserConfig = fetchConfig({
    prepare: (id: number, formData: FormData) => [
        `api/user${id}`,
        {
            ...initFormPost(formData),
            method: "PUT"
        }
    ],
    getResult: (json: any) => json as boolean,
    getError: (json: any) => json as RestValidationErrorDTO
});
```

- `initFormPost` is a helper method, which will create a form-data POST from a FormData object. See further below for more details.
- Additionally, since `initFormPost` sets the property `method` to "POST", we override this here with a "PUT".
- In this case, we expect the server to return `true` on success.
- Aside from that there is nothing special going on here.

```tsx
function EditUserComponent(props: { id: number }) {
    const [getUser] = useFetch(getUserConfig, [props.id]);
    const [updateUser, submitUpdateUser] = useFetch(updateUserConfig);

    if (getUser.error) return <div>Error fetching user</div>;
    if (getUser.loading) return <div>Loading..</div>;

    const user = getUser.result;
    const validationErrors = updateUser.errorResult?.validation_errors || {};

    return (
        <Form
            onSubmit={(e) => submitUpdateUser(props.id, new FormData(e.currentTarget))}
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
            {updateUser.error && (
                <div>Error: {updateUser.errorResult?.error || updateUser.cause?.message || "Unknown Error"}</div>
            )}
            <button type="submit">Save</button>
        </Form>
    );
}
```

There's a lot more going on here:

- In addition to getting the user, which we already did in the first example,
- We're also using `useFetch` with the `updateUserConfig` object. No second argument means we need to call it manually.
  - The second entry in the returned array is a submit function, which you can call to manually (re-)submit the request.
- We're getting a validation hashmap from the errorResult in case there has been a server-side error. The server obviously needs to supply this.
- We're using some pseudo UI library to define our user form:
  - onSubmit is just passed on to the `<form>` element, so we only get notified of the submit.
    - On submit, we create a new FormData object from the `<form>` element.
    - The biggest advantage of this is that you don't need to connect all of your input elements to your components state.
  - When an error happened, we try to show some information about it. See further below for more information on the state values.

#### Callback functions

If you want to act upon success/error/exception when they happen, you can do it like this:
```tsx
function UserComponent(props: { id: number }) {
    const [getUser] = useFetch({
        ...getUserConfig,
        onSuccess(result: UserDTO, status: number) {
            console.log('success', result, status);
        },
        onError(errorResult: TError, status: number) {
            console.log('error', errorResult, status);
        },
        onException(error: Error) {
            console.log('exception', error);
        },
    }, [props.id]);
    // ...
}
```

### API

#### fetchConfig

- `fetchConfig` essentially only returns what's being passed in, but adds types required for `useFetch`.
- it takes an object with 3 attributes:
  - `prepare` is a function used to get the parameters you would pass to a fetch call.
    - its parameters are up to you
    - it returns an array which specify the arguments passed to `fetch`.
  - `getResult` is a function called to convert the returned json to a type-safe version.
  - `getError` is essentially the same, but for the case where `response.ok === false`. I.e. you can have a different type for non-ok responses.


#### useFetch

- `useFetch` can take one or two parameters.
  - The first is a configuration object created via `fetchConfig`.
    - You can extend this object with callback functions here (`onSuccess`, `onError` and `onException`)
  - If you specify a second parameter, the fetch will be started instantly without a manual trigger
    - The second parameter is an array containing all the arguments you would pass to the `prepare` function of your config object.
- `useFetch` returns an array containing 3 items:
  - The first entry is the current state of the fetch request, containing the results or error when it's done. See below for more details.
  - The second entry is a submit function, which you can call to manually (re-)submit the request.
  - The third entry is an abort function to cancel the active request.

#### FetchState

The first entry of the array returned by `useFetch` is a state object:

```tsx
export interface FetchState<TError, TResult> {
    // Request is currently in progress
    loading?: boolean;
    // Request has finished successfully and the result is stored in the result attribute
    success?: boolean;
    // Request has finished with either an error or an exception.
    error?: boolean;
    // The status code of the response (if no exception has been thrown)
    responseStatus?: number;
    // The response of the server as JSON in case of success
    result?: TResult;
    // The response of the server as JSON in case of error
    errorResult?: TError;
    // If an exception has been thrown, this will contain the error
    cause?: Error;
}
```

#### Prepared RequestInit objects

In these objects `credentials` is always set to "include" and a header `Accept` has been set to "application/json"

- `defaultGetInit` prepares a GET request
- `defaultPostInit` prepares a form url-encoded POST request
- `defaultFormDataPostInit` prepares a form-data POST request.
- `initFormPost` is a method, which takes a `FormData` object and detects if it contains files.
  - if it contains files, `defaultFormDataPostInit` will be used in combination with a matching body attribute
  - otherwise `defaultPostInit` will be used in combination with a matching body attribute

### Report isssues

Something not working quite as expected? Do you need a feature that has not been implemented yet? Check the [issue tracker](https://github.com/Lusito/react-use-fetch-ts/issues) and add a new one if your problem is not already listed. Please try to provide a detailed description of your problem, including the steps to reproduce it.

### Contribute

Awesome! If you would like to contribute with a new feature or submit a bugfix, fork this repo and send a pull request. Please, make sure all the unit tests are passing before submitting and add new ones in case you introduced new features.

### License

react-use-fetch-ts has been released under the [zlib/libpng](https://github.com/Lusito/react-use-fetch-ts/blob/master/LICENSE) license, meaning you
can use it free of charge, without strings attached in commercial and non-commercial projects. Credits are appreciated but not mandatory.
