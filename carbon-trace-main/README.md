# carbon-trace

Frontend requiring a partially AAS API specification compliant backend (such as
[CarbonFootprintAPI](https://github.com/movabo/CarbonFootprintAPI)) to analyze footprints of
assets from asset administration shells (.aas(x)-files).

## Project Setup

```sh
npm install
```

### Development

#### Compile and hot reload

```sh
npm run dev
```

#### (Re-)generate the API response types

The API must be running at localhost:8080.

```sh
npm run generate
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```


### Docker

We offer a Dockerfile to build a simple static http server hosting the build of this package and serving
as base when building the API-backend with the frontend bundled.

When building for bundling, do not forget to tag it.

The server will be exposed on port 8080.

For rendering the maps, a [public mapbox access token](https://docs.mapbox.com/help/getting-started/access-tokens/#public-tokens)
is required and should be set as environment variable `MAPBOX_ACCESS_TOKEN`.

Further required environment variables are the asset administration shell API endpoints (which must be IDTA specification compliant):

 * `ASSET_ADMINISTRATION_SHELL_REGISTRY_URL`
 * `ASSET_ADMINISTRATION_SHELL_REPOSITORY_URL`
 * `ASSET_ADMINISTRATION_SHELL_SUBMODEL_REPOSITORY_URL`

Optional are the following variables:

 * `PREFER_SUBMODELS_REPOSITORY`: Whether to prefer the submodels API for querying asset information
 * `ASSET_ADMINISTRATION_SHELL_ADDITIONALS_URL`: Non-API compliant endpoint (provided e.g. by CarbonFootprintAPI) to allow loading external shells

```sh
docker build -t carbon-trace .
docker run -e MAPBOX_ACCESS_TOKEN='pk.abc...' -p 8080:8080 carbon-trace
```

### Development setup from scratch (including the API)

For setup, we assume the following directory structure:

- `/carbon-trace` the root of this repository
- `/CarbonFootprintAPI` the backend serving the [API](https://github.com/movabo/CarbonFootprintAPI)
- `/repo` a repository containing all AAS and AASX files in its root directory (not within subdirectories)

```sh
$ cd /carbon-trace-main
$ npm install
$ cd /carbon-footprint-api
$ mvn install
```

Now you're basically set up. Make sure when building and running the APIs, to correctly use the following
parameters: `--cors`, `--aas`, and `--aasx`.

After a build (e.g. with `mvn clean package` and after `cd target`), you can run as follows:

```sh
$ java -jar CarbonFootprintAPI-0.0.1-SNAPSHOT.jar --aasx "/repo/*.aasx" --aas "/repo/*.aas" --cors "http://localhost:5173"
```

Now you can access the API via [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html).

After simultaneously running the frontend with:

```sh
$ cd /CarbonFootprintFrontend
$ npm run dev
```

you can access the frontend via [http://localhost:5173](http://localhost:5173).

To update the types in the frontend after changes to the API, run

```sh
$ npm run generate
```
