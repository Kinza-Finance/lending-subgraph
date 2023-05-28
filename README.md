## Development

```bash

# copy env and adjust its content with your personal access token and subgraph name

# you can get an access token from https://thegraph.com/explorer/dashboard
cp .env.test .env

# install project dependencies
npm i

# to regenrate types if schema.graphql has changed
npm run subgraph:codegen

# to run a test build of your subgraph
npm run subgraph:build

# now you're able to deploy to thegraph hosted service with one of the deploy commands:
npm run deploy:hosted:mainnet

```