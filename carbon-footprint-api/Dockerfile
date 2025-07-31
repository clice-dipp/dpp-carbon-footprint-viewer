# image tag of the carbon footprint frontend to use for serving static files:
ARG FRONTEND_TAG=""

# Which version to build depending if FRONTEND_TAG is set or not
ARG BUILD_VERSION=${FRONTEND_TAG:+npm}
ARG BUILD_VERSION=${BUILD_VERSION:-plain}

FROM --platform=linux/amd64 ${FRONTEND_TAG:-alpine} as build-npm
# Frontend is set; we don't need npm anymore since we host the static files via spring
RUN apk del npm

FROM alpine:3.19 as build-plain
# Create a static dir for mounting
RUN mkdir /opt/static

FROM ${FRONTEND_TAG:-build-plain}
COPY . /opt/backend

RUN apk add openjdk21-jre && \
    apk add maven && \
    cd /opt/backend && \
    mvn clean package && \
    mv /opt/backend/target/*.jar /opt/api.jar && \
    rm -rf /opt/backend && \
    mkdir /opt/repo

ARG FRONTEND_TAG

ENV MAPBOX_ACCESS_TOKEN=""
ENV ASSET_ADMINISTRATION_SHELL_REGISTRY_URL="/api/v3.0"
ENV ASSET_ADMINISTRATION_SHELL_REPOSITORY_URL="/api/v3.0"
ENV ASSET_ADMINISTRATION_SHELL_SUBMODEL_REPOSITORY_URL="/api/v3.0"
ENV ASSET_ADMINISTRATION_SHELL_ADDITIONALS_URL="/api/v3.0"
ENV PREFER_SUBMODELS_REPOSITORY="0"

ENV RUN_ARGS=${FRONTEND_TAG:+"--notFoundResource /index.html --suppress404 "}"--aas \"/opt/repo/*.aas\" --aasx \"/opt/repo/*.aasx\" --static \"/opt/static/\""

EXPOSE 8080
ENTRYPOINT sh /run.sh java -jar /opt/api.jar ${RUN_ARGS}
