# graph-to-openapi

[![Coverage Status](https://coveralls.io/repos/github/thoughtspot/graph-to-openapi/badge.svg?branch=main)](https://coveralls.io/github/thoughtspot/graph-to-openapi?branch=main)

Convert a Graphql Schema to OpenAPI Spec w/ customization hooks

## Usage

```graphql
# schema.graphql

## This directive declaration needs to be added to your graphql definitions.
## Needs to be defined only once.
directive @rest(
  """
  REST path for the generated API route.
  """
  path: String = "/api/"
  """
  API Method
  """
  method: String = "GET"
  """
  Tag to add to the generated API route.
  """
  tag: String = ""
  """
  Hide the operation from the generated spec.
  """
  hidden: Boolean = false
) on FIELD_DEFINITION

type Mutation {
  """
  This is a comment which will become the description of this REST
  endpoint.
  """
  updateUser(
    """
    This comment becomes the description of the query parameter.
    """
    name: String
    """
    The GUID of the user account to query
    """
    id: String!

    """
    The updated display name
    """
    displayName: String
  ): UserResponse @rest(path: "/user", method: "PUT", tag: "User")
}

type Query {
  getUser(
    """
    The GUID of the user account to query
    """
    id: String!
  ): UserResponse @rest(path: "/user", method: "GET", tag: "User")
}

input UserResponse {
  ...
}
```

```ts
import { getOpenAPISpec } from "@thoughtspot/gql-to-openapi";

const openAPISpec = getOpenAPISpec({
  schema,
  info: {},
  basePath: "/api/v1",
});

fs.writeFile(fileName, openAPISpec);
```
