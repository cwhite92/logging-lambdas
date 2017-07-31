# Lambda functions for accepting logs over HTTP

## Ingest entrypoint function

This is the function that API Gateway hits. It validates the request payload (the log) and then invokes the `ingest`
handler asynchronously. We do this so that the API Gateway endpoint returns a response as soon as possible. This way
it's not waiting around for the function to insert to Elasticsearch.

## Ingest function

This function actually puts the logging payload into Elasticsearch. It also relates the log entry to an environment
(basically the application that sent the log) using the token that was used to authenticate the HTTP request.
