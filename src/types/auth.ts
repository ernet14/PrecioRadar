export type AuthFormState = {
  status: "idle" | "error" | "success";
  message: string;
  fields?: {
    email?: string;
    name?: string;
  };
};

export const authFormInitialState: AuthFormState = {
  status: "idle",
  message: "",
};
