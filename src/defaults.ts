export const defaultGetInit: RequestInit = {
    method: "GET",
    credentials: "include",
    headers: {
        Accept: "application/json",
    },
};

export const defaultPostInit: RequestInit = {
    method: "POST",
    credentials: "include",
    headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    },
};

export const defaultFormDataPostInit: RequestInit = {
    method: "POST",
    credentials: "include",
    headers: {
        Accept: "application/json",
    },
};

export function initFormPost(formData: FormData): RequestInit {
    const entries = Array.from(formData.entries());
    if (entries.some((entry) => entry[1] instanceof File)) {
        return {
            ...defaultFormDataPostInit,
            body: formData,
        };
    }
    return {
        ...defaultPostInit,
        body: entries.map(([key, value]) => `${key}=${encodeURIComponent(value.toString())}`).join("&"),
    };
}
