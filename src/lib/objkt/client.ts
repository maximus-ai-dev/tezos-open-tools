import { OBJKT_GRAPHQL } from "@/lib/constants";

export class ObjktGraphQLError extends Error {
  constructor(message: string, public errors?: unknown) {
    super(message);
    this.name = "ObjktGraphQLError";
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function objktQuery<TData, TVars extends Record<string, unknown> = Record<string, unknown>>(
  query: string,
  variables?: TVars,
  init?: RequestInit & { revalidate?: number },
): Promise<TData> {
  const { revalidate = 30, ...rest } = init ?? {};
  const res = await fetch(OBJKT_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(rest.headers ?? {}),
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate },
    ...rest,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ObjktGraphQLError(`Objkt GraphQL ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as GraphQLResponse<TData>;
  if (json.errors && json.errors.length > 0) {
    throw new ObjktGraphQLError(json.errors.map((e) => e.message).join("; "), json.errors);
  }
  if (!json.data) {
    throw new ObjktGraphQLError("Objkt GraphQL: empty response");
  }
  return json.data;
}
