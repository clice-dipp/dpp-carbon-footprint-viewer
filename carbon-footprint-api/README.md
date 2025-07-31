# Carbon Footprint API

Java Spring REST-API providing general details of AASX files as well as preprocessed data around the carbon footprint submodels.

Even though we do not guarantee it, the APIs endpoints should be mostly compliant with those mentioned in [the API specification by IDTA](https://industrialdigitaltwin.org/wp-content/uploads/2023/04/IDTA-01002-3-0_SpecificationAssetAdministrationShell_Part2_API.pdf). 

## Run

The API provides following options:

```
usage: CarbonFootprintApiApplication
    --aas <arg>                Aas-files to add to the lookup repository,
                               can be used multiple times
    --aasx <arg>               Aasx-files to add to the lookup repository,
                               can be used multiple times
    --checkReposNotEmpty       When using --aas and --aasx, check whether
                               it matches at least one file and otherwise
                               exit
    --cors <arg>               Allowed cors origins
 -h,--help                     Print this help message
    --notFoundResource <arg>   Relative path of a file inside the static
                               resources directory (specified with
                               --static) to serve when a 404 error occurs,
                               should start with a /. E.g. /index.html for
                               SPAs.
    --port <arg>               Port to run the server on
    --static <arg>             Static resources to serve
    --suppress404              Suppress a 404 return value if notFoundFile
                               is being served (useful for SPAs)
```

By default, the API runs on Port 8080. Swagger is available on `/api/docs`.

The following demonstrates how to run the server. It
 1. loads all .aasx-files in `/home/test/repo/`
 2. serves static files from `/home/test/singlePageApplication/` if there is no API controller for a request
 3. serves the file `/home/test/singlePageApplication/index.html` if there was neither an API controller or a static
    resource for the request
 4. suppresses 404 error codes when serving the `/home/test/singlePageApplication/index.html`

```
--aasx "/home/test/repo/*.aasx" --static "/home/test/singlePageApplication/" --notFoundResource "/index.html" --suppress404
```

## Develop and Build

For development, run 
```sh
mvn install
```
and for building
```sh
mvn clean package
```

### Docker

We also offer a Dockerfile for building.
If you have previously built and tagged the frontend, you can use this as basis so the static files of the frontend
will be hosted by the backends server as well.

Therefore build the image as follows:
```sh
docker build -t carbon-footprint-api --build-arg FRONTEND_TAG=carbon-trace .
```

To build the image without it, just omit the build-arg:
```sh
docker build -t carbon-footprint-api-alone .
```

The server will be exposed at port 8080. Don't forget to mount the aas(x) files to the /opt/repo directory of the
container:

For rendering the maps, a [public mapbox access token](https://docs.mapbox.com/help/getting-started/access-tokens/#public-tokens)
is required when building with the carbon-trace frontend, and should be set as environment variable `MAPBOX_ACCESS_TOKEN`.


```sh
docker run -p 8080:8080 -e MAPBOX_ACCESS_TOKEN='pk.abc...' -v /path/to/aasxDirectory:/opt/repo:ro carbon-trace
```

You can also mount your own static files by mounting them as read-only to `/opt/static`.

# Documentation

For javadocs, see the [`/docs`-directory](./docs).
For other documentation than the one provided here or by javadocs, visit the [CarbonFootprintFrontend](https://github.com/movabo/CarbonFootprintFrontend).
